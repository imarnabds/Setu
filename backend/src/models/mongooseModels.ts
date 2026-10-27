import mongoose, { Schema, Document } from 'mongoose';
import {
  IPO,
  User,
  PokeRequest,
  Connection,
  Message,
  CommissionHistory,
  Notification,
  AuditLog
} from './types.js';

// Global options for all schemas: preserve _id as string ID, expose virtual 'id', strip __v
const schemaOptions = {
  timestamps: false, // We preserve source ISO timestamp strings exactly
  toJSON: {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      ret.id = ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      ret.id = ret._id;
      delete ret.__v;
      return ret;
    }
  }
};

// -----------------------------------------------------------------------------
// 1. User Schema
// -----------------------------------------------------------------------------
const UserSchema = new Schema(
  {
    _id: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    mobileNumber: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    primaryRole: {
      type: String,
      enum: ['investor', 'demat_holder', 'admin'],
      required: true
    },
    isEmailVerified: { type: Boolean, default: false },
    isMobileVerified: { type: Boolean, default: false },
    isKycVerified: { type: Boolean, default: false },
    emailOtpCode: String,
    emailOtpExpiresAt: String,
    kycDetails: {
      documentType: String,
      documentNumberMasked: String,
      submittedAt: String,
      status: {
        type: String,
        enum: ['none', 'pending', 'verified', 'rejected'],
        default: 'none'
      },
      notes: String,
      verifiedAt: String,
      livePhotoUrl: String,
      aadhaarNumber: String,
      aadhaarFrontUrl: String,
      aadhaarBackUrl: String,
      panNumber: String,
      panCardUrl: String,
      reviewedBy: String,
      reviewedAt: String
    },
    avatarUrl: String,
    city: String,
    region: String,
    bio: String,
    investmentExperience: String,
    preferredLanguage: String,
    supportedCategories: [{ type: String }],
    defaultCommissionRate: { type: Number, default: 5.0, min: 0, max: 50 },
    commissionBasis: {
      type: String,
      default: 'Commission on Listing Profit'
    },
    isAvailable: { type: Boolean, default: true },
    upiId: { type: String, trim: true },
    isUpiVerified: { type: Boolean, default: false },
    upiVerifiedAt: String,
    refreshToken: String,
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true }
  },
  schemaOptions
);

UserSchema.virtual('id').get(function () {
  return this._id;
});

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ mobileNumber: 1 }, { unique: true });
UserSchema.index({ primaryRole: 1, isAvailable: 1 });
UserSchema.index({ defaultCommissionRate: 1 });

// -----------------------------------------------------------------------------
// 2. IPO Schema (Minimal: Name & Status only, per requirements)
// -----------------------------------------------------------------------------
const IPOSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['Upcoming', 'Open', 'Closed', 'Listed'],
      required: true,
      default: 'Upcoming'
    },
    lastUpdated: { type: String, required: true },
    isStale: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: true },
    isArchived: { type: Boolean, default: false },
    source: { type: String, default: 'upstox' },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true }
  },
  schemaOptions
);

IPOSchema.virtual('id').get(function () {
  return this._id;
});

IPOSchema.index({ status: 1 });
IPOSchema.index({ lastUpdated: -1 });
IPOSchema.index({ isArchived: 1, isVerified: 1 });

// -----------------------------------------------------------------------------
// 2b. IPO Sync State Schema (Tracking provider sync status & staleness)
// -----------------------------------------------------------------------------
const IpoSyncStateSchema = new Schema(
  {
    _id: { type: String, required: true, default: 'ipo_sync_state' },
    lastSyncAttempt: { type: String, required: true },
    lastSuccessfulSync: String,
    syncStatus: {
      type: String,
      enum: ['synced', 'stale', 'failed', 'unauthorized'],
      default: 'synced'
    },
    syncError: String,
    totalOfferings: { type: Number, default: 0 },
    insertedCount: { type: Number, default: 0 },
    updatedCount: { type: Number, default: 0 },
    archivedCount: { type: Number, default: 0 }
  },
  schemaOptions
);

IpoSyncStateSchema.virtual('id').get(function () {
  return this._id;
});

// -----------------------------------------------------------------------------
// 3. Poke Request Schema
// -----------------------------------------------------------------------------
const PokeRequestSchema = new Schema(
  {
    _id: { type: String, required: true },
    senderId: { type: String, required: true, ref: 'User' },
    recipientId: { type: String, required: true, ref: 'User' },
    senderRole: { type: String, required: true },
    recipientRole: { type: String, required: true },
    ipoId: { type: String, ref: 'IPO' },
    ipoName: String,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled', 'expired'],
      default: 'pending'
    },
    proposedCommissionRate: Number,
    commissionBasis: String,
    message: String,
    rejectionReason: String,
    agreedCommissionRate: Number,
    agreedCommissionBasis: String,
    acceptedAt: String,
    rejectedAt: String,
    cancelledAt: String,
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true }
  },
  schemaOptions
);

PokeRequestSchema.virtual('id').get(function () {
  return this._id;
});

PokeRequestSchema.index({ senderId: 1, recipientId: 1 });
PokeRequestSchema.index({ ipoId: 1, recipientId: 1, status: 1 });
PokeRequestSchema.index({ status: 1, createdAt: -1 });

// -----------------------------------------------------------------------------
// 4. Connection Schema
// -----------------------------------------------------------------------------
const ConnectionSchema = new Schema(
  {
    _id: { type: String, required: true },
    ipoId: { type: String, required: true, ref: 'IPO' },
    ipoName: { type: String, required: true },
    userAId: { type: String, required: true, ref: 'User' },
    userBId: { type: String, required: true, ref: 'User' },
    pokeRequestId: { type: String, required: true, ref: 'PokeRequest' },
    agreedCommissionRate: { type: Number, required: true },
    agreedCommissionBasis: { type: String, required: true },
    status: {
      type: String,
      enum: ['active', 'disconnected', 'blocked'],
      default: 'active'
    },
    blockedById: String,
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true }
  },
  schemaOptions
);

ConnectionSchema.virtual('id').get(function () {
  return this._id;
});

ConnectionSchema.index({ userAId: 1, userBId: 1 });
ConnectionSchema.index({ ipoId: 1, userAId: 1, userBId: 1 });
ConnectionSchema.index({ pokeRequestId: 1 });
ConnectionSchema.index({ status: 1 });

// -----------------------------------------------------------------------------
// 4. Message Schema
// -----------------------------------------------------------------------------
const MessageSchema = new Schema(
  {
    _id: { type: String, required: true },
    connectionId: { type: String, required: true, ref: 'Connection' },
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true, ref: 'User' },
    content: { type: String, required: true },
    type: {
      type: String,
      enum: ['text', 'system', 'commission_proposal'],
      default: 'text'
    },
    metadata: { type: Schema.Types.Mixed },
    readAt: String,
    createdAt: { type: String, required: true }
  },
  schemaOptions
);

MessageSchema.virtual('id').get(function () {
  return this._id;
});

MessageSchema.index({ connectionId: 1, createdAt: 1 });
MessageSchema.index({ receiverId: 1, readAt: 1 });

// -----------------------------------------------------------------------------
// 5. Commission History Schema
// -----------------------------------------------------------------------------
const CommissionHistorySchema = new Schema(
  {
    _id: { type: String, required: true },
    holderId: { type: String, required: true, ref: 'User' },
    previousRate: { type: Number, required: true },
    newRate: { type: Number, required: true },
    basis: { type: String, required: true },
    targetApplicantId: String,
    changedById: { type: String, required: true },
    reason: String,
    timestamp: { type: String, required: true }
  },
  schemaOptions
);

CommissionHistorySchema.virtual('id').get(function () {
  return this._id;
});

CommissionHistorySchema.index({ holderId: 1, timestamp: -1 });

// -----------------------------------------------------------------------------
// 6. Notification Schema
// -----------------------------------------------------------------------------
const NotificationSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, ref: 'User' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, required: true },
    referenceId: String,
    data: { type: Schema.Types.Mixed },
    isRead: { type: Boolean, default: false },
    createdAt: { type: String, required: true }
  },
  schemaOptions
);

NotificationSchema.virtual('id').get(function () {
  return this._id;
});

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

// -----------------------------------------------------------------------------
// 7. Audit Log Schema
// -----------------------------------------------------------------------------
const AuditLogSchema = new Schema(
  {
    _id: { type: String, required: true },
    actorId: { type: String, required: true },
    action: { type: String, required: true },
    details: { type: Schema.Types.Mixed, default: {} },
    ipAddress: String,
    timestamp: { type: String, required: true }
  },
  schemaOptions
);

AuditLogSchema.virtual('id').get(function () {
  return this._id;
});

AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ actorId: 1, timestamp: -1 });

// -----------------------------------------------------------------------------
// Model Exports
// -----------------------------------------------------------------------------
export const MongoIpoModel =
  mongoose.models.IPO || mongoose.model<IPO & Document>('IPO', IPOSchema);

export const MongoIpoSyncStateModel =
  mongoose.models.IpoSyncState ||
  mongoose.model('IpoSyncState', IpoSyncStateSchema);

export const MongoUserModel =
  mongoose.models.User || mongoose.model<User & Document>('User', UserSchema);

export const MongoPokeModel =
  mongoose.models.PokeRequest ||
  mongoose.model<PokeRequest & Document>('PokeRequest', PokeRequestSchema);

export const MongoConnectionModel =
  mongoose.models.Connection ||
  mongoose.model<Connection & Document>('Connection', ConnectionSchema);

export const MongoMessageModel =
  mongoose.models.Message ||
  mongoose.model<Message & Document>('Message', MessageSchema);

export const MongoCommissionModel =
  mongoose.models.CommissionHistory ||
  mongoose.model<CommissionHistory & Document>(
    'CommissionHistory',
    CommissionHistorySchema
  );

export const MongoNotificationModel =
  mongoose.models.Notification ||
  mongoose.model<Notification & Document>('Notification', NotificationSchema);

export const MongoAuditModel =
  mongoose.models.AuditLog ||
  mongoose.model<AuditLog & Document>('AuditLog', AuditLogSchema);
