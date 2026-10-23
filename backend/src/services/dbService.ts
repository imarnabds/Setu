import {
  IPO,
  User,
  PokeRequest,
  Connection,
  Message,
  CommissionHistory,
  Notification,
  AuditLog
} from '../models/types.js';
import {
  MongoIpoModel,
  MongoIpoSyncStateModel,
  MongoUserModel,
  MongoPokeModel,
  MongoConnectionModel,
  MongoMessageModel,
  MongoCommissionModel,
  MongoNotificationModel,
  MongoAuditModel
} from '../models/mongooseModels.js';

// Helper to normalize Mongoose lean document _id to id
const mapDoc = <T>(doc: any): T | null => {
  if (!doc) return null;
  const mapped = { ...doc };
  if (!mapped.id && mapped._id) {
    mapped.id = mapped._id.toString();
  }
  return mapped as T;
};

const mapDocs = <T>(docs: any[]): T[] => {
  return docs.map((d) => mapDoc<T>(d)!);
};

export class MongoDatabaseService {
  // ---------------------------------------------------------------------------
  // 0. IPOs
  // ---------------------------------------------------------------------------
  async getAllIpos(filter: Record<string, any> = {}): Promise<IPO[]> {
    const docs = await MongoIpoModel.find(filter).sort({ updatedAt: -1 }).lean().exec();
    return mapDocs<IPO>(docs);
  }

  async findIpoById(id: string): Promise<IPO | null> {
    const doc = await MongoIpoModel.findById(id).lean().exec();
    return mapDoc<IPO>(doc);
  }

  async createIpo(ipo: IPO): Promise<IPO> {
    const payload = { ...ipo, _id: ipo.id };
    const created = await MongoIpoModel.create(payload);
    return mapDoc<IPO>(created.toObject())!;
  }

  async updateIpo(id: string, updates: Partial<IPO>): Promise<IPO | null> {
    const updated = await MongoIpoModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...updates,
          updatedAt: new Date().toISOString()
        }
      },
      { new: true }
    )
      .lean()
      .exec();
    return mapDoc<IPO>(updated);
  }

  async upsertIpo(ipo: {
    id: string;
    name: string;
    status: 'Upcoming' | 'Open' | 'Closed' | 'Listed';
    lastUpdated: string;
    isStale?: boolean;
    isVerified?: boolean;
    isArchived?: boolean;
    source?: string;
  }): Promise<{ ipo: IPO; isNew: boolean }> {
    const now = new Date().toISOString();
    const existing = await MongoIpoModel.findById(ipo.id).lean().exec();
    const isNew = !existing;

    const updated = await MongoIpoModel.findByIdAndUpdate(
      ipo.id,
      {
        $set: {
          name: ipo.name,
          status: ipo.status,
          lastUpdated: ipo.lastUpdated,
          isStale: ipo.isStale ?? false,
          isVerified: ipo.isVerified ?? true,
          isArchived: ipo.isArchived ?? false,
          source: ipo.source || 'upstox',
          updatedAt: now
        },
        $setOnInsert: {
          _id: ipo.id,
          createdAt: now
        }
      },
      { upsert: true, new: true }
    )
      .lean()
      .exec();
    return { ipo: mapDoc<IPO>(updated)!, isNew };
  }

  async hasIpoDependencies(ipoId: string): Promise<boolean> {
    const [connCount, pokeCount] = await Promise.all([
      MongoConnectionModel.countDocuments({ ipoId }),
      MongoPokeModel.countDocuments({ ipoId })
    ]);
    return connCount > 0 || pokeCount > 0;
  }

  async archiveOrDeleteDemoIpo(ipoId: string): Promise<'deleted' | 'archived'> {
    const hasDeps = await this.hasIpoDependencies(ipoId);
    if (hasDeps) {
      await MongoIpoModel.findByIdAndUpdate(ipoId, {
        $set: {
          isArchived: true,
          isVerified: false,
          source: 'demo_preserved',
          isStale: true,
          updatedAt: new Date().toISOString()
        }
      });
      return 'archived';
    } else {
      await MongoIpoModel.findByIdAndDelete(ipoId);
      return 'deleted';
    }
  }

  async markAllIposStale(isStale: boolean = true): Promise<void> {
    await MongoIpoModel.updateMany({}, { $set: { isStale } }).exec();
  }

  async countIpos(filter: Record<string, any> = {}): Promise<number> {
    return MongoIpoModel.countDocuments(filter).exec();
  }

  // ---------------------------------------------------------------------------
  // 0b. IPO Sync State
  // ---------------------------------------------------------------------------
  async getIpoSyncState(): Promise<any> {
    const doc = await MongoIpoSyncStateModel.findById('ipo_sync_state').lean().exec();
    return mapDoc<any>(doc);
  }

  async updateIpoSyncState(state: {
    lastSyncAttempt: string;
    lastSuccessfulSync?: string;
    syncStatus: 'synced' | 'stale' | 'failed' | 'unauthorized';
    syncError?: string | null;
    totalOfferings?: number;
    insertedCount?: number;
    updatedCount?: number;
    archivedCount?: number;
  }): Promise<any> {
    const updated = await MongoIpoSyncStateModel.findByIdAndUpdate(
      'ipo_sync_state',
      {
        $set: {
          ...state
        },
        $setOnInsert: {
          _id: 'ipo_sync_state'
        }
      },
      { upsert: true, new: true }
    )
      .lean()
      .exec();
    return mapDoc<any>(updated);
  }

  // ---------------------------------------------------------------------------
  // 1. Users
  // ---------------------------------------------------------------------------
  async getAllUsers(): Promise<User[]> {
    const docs = await MongoUserModel.find().lean().exec();
    return mapDocs<User>(docs);
  }

  async findUserById(id: string): Promise<User | null> {
    const doc = await MongoUserModel.findById(id).lean().exec();
    return mapDoc<User>(doc);
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const doc = await MongoUserModel.findOne({
      email: email.toLowerCase().trim()
    })
      .lean()
      .exec();
    return mapDoc<User>(doc);
  }

  async findUserByMobile(mobileNumber: string): Promise<User | null> {
    const doc = await MongoUserModel.findOne({
      mobileNumber: mobileNumber.trim()
    })
      .lean()
      .exec();
    return mapDoc<User>(doc);
  }

  async createUser(user: User): Promise<User> {
    const payload = { ...user, _id: user.id };
    const created = await MongoUserModel.create(payload);
    return mapDoc<User>(created.toObject())!;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const updated = await MongoUserModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...updates,
          updatedAt: new Date().toISOString()
        }
      },
      { new: true, runValidators: true }
    )
      .lean()
      .exec();
    return mapDoc<User>(updated);
  }

  async countUsers(filter: Record<string, any> = {}): Promise<number> {
    return MongoUserModel.countDocuments(filter).exec();
  }

  // ---------------------------------------------------------------------------
  // 2. Poke Requests
  // ---------------------------------------------------------------------------
  async getAllPokes(): Promise<PokeRequest[]> {
    const docs = await MongoPokeModel.find().lean().exec();
    return mapDocs<PokeRequest>(docs);
  }

  async findPokeById(id: string): Promise<PokeRequest | null> {
    const doc = await MongoPokeModel.findById(id).lean().exec();
    return mapDoc<PokeRequest>(doc);
  }

  async findPokesForUser(userId: string, ipoId?: string): Promise<PokeRequest[]> {
    const query: any = {
      $or: [{ senderId: userId }, { recipientId: userId }]
    };
    if (ipoId) {
      query.ipoId = ipoId;
    }
    const docs = await MongoPokeModel.find(query)
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return mapDocs<PokeRequest>(docs);
  }

  async findActivePokeBetween(
    userA: string,
    userB: string,
    ipoId?: string
  ): Promise<PokeRequest | null> {
    const query: any = {
      $or: [
        { senderId: userA, recipientId: userB },
        { senderId: userB, recipientId: userA }
      ],
      status: 'pending'
    };
    if (ipoId) {
      query.ipoId = ipoId;
    }
    const doc = await MongoPokeModel.findOne(query).lean().exec();
    return mapDoc<PokeRequest>(doc);
  }

  async createPoke(poke: PokeRequest): Promise<PokeRequest> {
    const payload = { ...poke, _id: poke.id };
    const created = await MongoPokeModel.create(payload);
    return mapDoc<PokeRequest>(created.toObject())!;
  }

  async updatePoke(
    id: string,
    updates: Partial<PokeRequest>
  ): Promise<PokeRequest | null> {
    const updated = await MongoPokeModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...updates,
          updatedAt: new Date().toISOString()
        }
      },
      { new: true }
    )
      .lean()
      .exec();
    return mapDoc<PokeRequest>(updated);
  }

  async acceptPokeConditionally(
    pokeId: string,
    recipientId: string,
    agreedCommissionRate: number,
    agreedCommissionBasis: string,
    acceptedAt: string
  ): Promise<PokeRequest | null> {
    const updated = await MongoPokeModel.findOneAndUpdate(
      { _id: pokeId, recipientId, status: 'pending' },
      {
        $set: {
          status: 'accepted',
          agreedCommissionRate,
          agreedCommissionBasis,
          acceptedAt,
          updatedAt: acceptedAt
        }
      },
      { new: true }
    )
      .lean()
      .exec();
    return mapDoc<PokeRequest>(updated);
  }

  async countPokes(filter: Record<string, any> = {}): Promise<number> {
    return MongoPokeModel.countDocuments(filter).exec();
  }

  // ---------------------------------------------------------------------------
  // 3. Connections
  // ---------------------------------------------------------------------------
  async getAllConnections(): Promise<Connection[]> {
    const docs = await MongoConnectionModel.find().lean().exec();
    return mapDocs<Connection>(docs);
  }

  async findConnectionById(id: string): Promise<Connection | null> {
    const doc = await MongoConnectionModel.findById(id).lean().exec();
    return mapDoc<Connection>(doc);
  }

  async findConnectionsForUser(userId: string, ipoId?: string): Promise<Connection[]> {
    const query: any = {
      $or: [{ userAId: userId }, { userBId: userId }]
    };
    if (ipoId) {
      query.ipoId = ipoId;
    }
    const docs = await MongoConnectionModel.find(query).lean().exec();
    return mapDocs<Connection>(docs);
  }

  async findConnectionBetweenUsers(
    userA: string,
    userB: string,
    ipoId?: string
  ): Promise<Connection | null> {
    const query: any = {
      $or: [
        { userAId: userA, userBId: userB },
        { userAId: userB, userBId: userA }
      ]
    };
    if (ipoId) {
      query.ipoId = ipoId;
    }
    const doc = await MongoConnectionModel.findOne(query).lean().exec();
    return mapDoc<Connection>(doc);
  }

  async createConnection(connection: Connection): Promise<Connection> {
    const payload = { ...connection, _id: connection.id };
    const created = await MongoConnectionModel.create(payload);
    return mapDoc<Connection>(created.toObject())!;
  }

  async updateConnection(
    id: string,
    updates: Partial<Connection>
  ): Promise<Connection | null> {
    const updated = await MongoConnectionModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...updates,
          updatedAt: new Date().toISOString()
        }
      },
      { new: true }
    )
      .lean()
      .exec();
    return mapDoc<Connection>(updated);
  }

  async countConnections(filter: Record<string, any> = {}): Promise<number> {
    return MongoConnectionModel.countDocuments(filter).exec();
  }

  // ---------------------------------------------------------------------------
  // 4. Messages
  // ---------------------------------------------------------------------------
  async getMessagesForConnection(connectionId: string): Promise<Message[]> {
    const docs = await MongoMessageModel.find({ connectionId })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return mapDocs<Message>(docs);
  }

  async createMessage(message: Message): Promise<Message> {
    const payload = { ...message, _id: message.id };
    const created = await MongoMessageModel.create(payload);
    return mapDoc<Message>(created.toObject())!;
  }

  async markMessagesAsRead(
    connectionId: string,
    receiverId: string
  ): Promise<void> {
    const now = new Date().toISOString();
    await MongoMessageModel.updateMany(
      {
        connectionId,
        receiverId,
        readAt: { $in: [null, undefined, ''] }
      },
      {
        $set: { readAt: now }
      }
    ).exec();
  }

  async countMessages(filter: Record<string, any> = {}): Promise<number> {
    return MongoMessageModel.countDocuments(filter).exec();
  }

  // ---------------------------------------------------------------------------
  // 5. Commission Histories
  // ---------------------------------------------------------------------------
  async getCommissionHistories(holderId?: string): Promise<CommissionHistory[]> {
    const query = holderId ? { holderId } : {};
    const docs = await MongoCommissionModel.find(query)
      .sort({ timestamp: -1 })
      .lean()
      .exec();
    return mapDocs<CommissionHistory>(docs);
  }

  async createCommissionHistory(
    entry: CommissionHistory
  ): Promise<CommissionHistory> {
    const payload = { ...entry, _id: entry.id };
    const created = await MongoCommissionModel.create(payload);
    return mapDoc<CommissionHistory>(created.toObject())!;
  }

  // ---------------------------------------------------------------------------
  // 6. Notifications
  // ---------------------------------------------------------------------------
  async getNotificationsForUser(userId: string): Promise<Notification[]> {
    const docs = await MongoNotificationModel.find({ userId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return mapDocs<Notification>(docs);
  }

  async createNotification(notification: Notification): Promise<Notification> {
    const payload = { ...notification, _id: notification.id };
    const created = await MongoNotificationModel.create(payload);
    return mapDoc<Notification>(created.toObject())!;
  }

  async markNotificationAsRead(id: string, userId: string): Promise<boolean> {
    const res = await MongoNotificationModel.updateOne(
      { _id: id, userId },
      { $set: { isRead: true } }
    ).exec();
    return res.modifiedCount > 0;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await MongoNotificationModel.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } }
    ).exec();
  }

  // ---------------------------------------------------------------------------
  // 7. Audit Logs
  // ---------------------------------------------------------------------------
  async getAuditLogs(): Promise<AuditLog[]> {
    const docs = await MongoAuditModel.find()
      .sort({ timestamp: -1 })
      .lean()
      .exec();
    return mapDocs<AuditLog>(docs);
  }

  async createAuditLog(log: AuditLog): Promise<AuditLog> {
    const payload = { ...log, _id: log.id };
    const created = await MongoAuditModel.create(payload);
    return mapDoc<AuditLog>(created.toObject())!;
  }
}

export const dbService = new MongoDatabaseService();
