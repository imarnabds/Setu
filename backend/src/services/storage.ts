/**
 * @deprecated ARCHIVED JSON PERSISTENCE SERVICE
 * Setu has migrated to MongoDB Atlas / MongoDB as its sole authoritative production database.
 * No production controllers or services import or call this service.
 * Retained strictly for legacy backup/reference and offline export scripts.
 */

import fs from 'fs';
import path from 'path';
import {
  User,
  PokeRequest,
  Connection,
  Message,
  CommissionHistory,
  Notification,
  AuditLog
} from '../models/types.js';

interface DatabaseSchema {
  users: User[];
  pokes: PokeRequest[];
  connections: Connection[];
  messages: Message[];
  commissionHistories: CommissionHistory[];
  notifications: Notification[];
  auditLogs: AuditLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

class StorageService {
  private data: DatabaseSchema;

  constructor() {
    this.data = {
      users: [],
      pokes: [],
      connections: [],
      messages: [],
      commissionHistories: [],
      notifications: [],
      auditLogs: []
    };
    this.initialize();
  }

  private initialize() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        // Ensure all arrays exist
        this.data.users = this.data.users || [];
        this.data.pokes = this.data.pokes || [];
        this.data.connections = this.data.connections || [];
        this.data.messages = this.data.messages || [];
        this.data.commissionHistories = this.data.commissionHistories || [];
        this.data.notifications = this.data.notifications || [];
        this.data.auditLogs = this.data.auditLogs || [];
      } else {
        this.persist();
      }
    } catch (err) {
      console.error('Error initializing StorageService database:', err);
      this.persist();
    }
  }

  private persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  // --- Users ---
  getAllUsers(): User[] {
    return this.data.users;
  }

  findUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  findUserByEmail(email: string): User | undefined {
    return this.data.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase().trim()
    );
  }

  findUserByMobile(mobileNumber: string): User | undefined {
    return this.data.users.find(
      (u) => u.mobileNumber.trim() === mobileNumber.trim()
    );
  }

  createUser(user: User): User {
    this.data.users.push(user);
    this.persist();
    return user;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return undefined;
    this.data.users[idx] = {
      ...this.data.users[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.persist();
    return this.data.users[idx];
  }

  // --- Pokes ---
  getAllPokes(): PokeRequest[] {
    return this.data.pokes;
  }

  findPokeById(id: string): PokeRequest | undefined {
    return this.data.pokes.find((p) => p.id === id);
  }

  findPokesForUser(userId: string): PokeRequest[] {
    return this.data.pokes.filter(
      (p) => p.senderId === userId || p.recipientId === userId
    );
  }

  findActivePokeBetween(userA: string, userB: string): PokeRequest | undefined {
    return this.data.pokes.find(
      (p) =>
        ((p.senderId === userA && p.recipientId === userB) ||
          (p.senderId === userB && p.recipientId === userA)) &&
        p.status === 'pending'
    );
  }

  createPoke(poke: PokeRequest): PokeRequest {
    this.data.pokes.push(poke);
    this.persist();
    return poke;
  }

  updatePoke(id: string, updates: Partial<PokeRequest>): PokeRequest | undefined {
    const idx = this.data.pokes.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    this.data.pokes[idx] = {
      ...this.data.pokes[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.persist();
    return this.data.pokes[idx];
  }

  // --- Connections ---
  getAllConnections(): Connection[] {
    return this.data.connections;
  }

  findConnectionById(id: string): Connection | undefined {
    return this.data.connections.find((c) => c.id === id);
  }

  findConnectionsForUser(userId: string): Connection[] {
    return this.data.connections.filter(
      (c) => c.userAId === userId || c.userBId === userId
    );
  }

  findConnectionBetweenUsers(userA: string, userB: string): Connection | undefined {
    return this.data.connections.find(
      (c) =>
        (c.userAId === userA && c.userBId === userB) ||
        (c.userAId === userB && c.userBId === userA)
    );
  }

  createConnection(connection: Connection): Connection {
    this.data.connections.push(connection);
    this.persist();
    return connection;
  }

  updateConnection(id: string, updates: Partial<Connection>): Connection | undefined {
    const idx = this.data.connections.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    this.data.connections[idx] = {
      ...this.data.connections[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.persist();
    return this.data.connections[idx];
  }

  // --- Messages ---
  getMessagesForConnection(connectionId: string): Message[] {
    return this.data.messages.filter((m) => m.connectionId === connectionId);
  }

  createMessage(message: Message): Message {
    this.data.messages.push(message);
    this.persist();
    return message;
  }

  markMessagesAsRead(connectionId: string, receiverId: string): void {
    let changed = false;
    const now = new Date().toISOString();
    this.data.messages.forEach((m) => {
      if (m.connectionId === connectionId && m.receiverId === receiverId && !m.readAt) {
        m.readAt = now;
        changed = true;
      }
    });
    if (changed) this.persist();
  }

  // --- Commission Histories ---
  getCommissionHistories(holderId?: string): CommissionHistory[] {
    if (!holderId) return this.data.commissionHistories;
    return this.data.commissionHistories.filter((ch) => ch.holderId === holderId);
  }

  createCommissionHistory(entry: CommissionHistory): CommissionHistory {
    this.data.commissionHistories.push(entry);
    this.persist();
    return entry;
  }

  // --- Notifications ---
  getNotificationsForUser(userId: string): Notification[] {
    return this.data.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createNotification(notification: Notification): Notification {
    this.data.notifications.push(notification);
    this.persist();
    return notification;
  }

  markNotificationAsRead(id: string, userId: string): boolean {
    const notif = this.data.notifications.find((n) => n.id === id && n.userId === userId);
    if (notif) {
      notif.isRead = true;
      this.persist();
      return true;
    }
    return false;
  }

  markAllNotificationsAsRead(userId: string): void {
    let changed = false;
    this.data.notifications.forEach((n) => {
      if (n.userId === userId && !n.isRead) {
        n.isRead = true;
        changed = true;
      }
    });
    if (changed) this.persist();
  }

  // --- Audit Logs ---
  getAuditLogs(): AuditLog[] {
    return this.data.auditLogs.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  createAuditLog(log: AuditLog): AuditLog {
    this.data.auditLogs.push(log);
    this.persist();
    return log;
  }

  // Clear/Reset for testing or seeding
  resetDatabase(initialData?: Partial<DatabaseSchema>) {
    this.data = {
      users: initialData?.users || [],
      pokes: initialData?.pokes || [],
      connections: initialData?.connections || [],
      messages: initialData?.messages || [],
      commissionHistories: initialData?.commissionHistories || [],
      notifications: initialData?.notifications || [],
      auditLogs: initialData?.auditLogs || []
    };
    this.persist();
  }
}

export const storage = new StorageService();
