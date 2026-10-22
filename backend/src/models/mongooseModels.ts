import mongoose, { Schema } from 'mongoose';

const UserSchema = new Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobileNumber: { type: String, required: true },
    password: { type: String, required: true },
    primaryRole: {
      type: String,
      enum: ['investor', 'demat_holder', 'admin'],
      required: true
    },
    isEmailVerified: { type: Boolean, default: false },
    isMobileVerified: { type: Boolean, default: false },
    isKycVerified: { type: Boolean, default: false },
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
      verifiedAt: String
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
      default: 'Fixed Advisory / Application Service Fee Base'
    },
    isAvailable: { type: Boolean, default: true },
    refreshToken: String
  },
  { timestamps: true }
);

const PokeRequestSchema = new Schema(
  {
    senderId: { type: String, required: true, ref: 'User' },
    recipientId: { type: String, required: true, ref: 'User' },
    senderRole: { type: String, required: true },
    recipientRole: { type: String, required: true },
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
    cancelledAt: String
  },
  { timestamps: true }
);

const ConnectionSchema = new Schema(
  {
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
    blockedById: String
  },
  { timestamps: true }
);

const MessageSchema = new Schema(
  {
    connectionId: { type: String, required: true, ref: 'Connection' },
    senderId: { type: String, required: true, ref: 'User' },
    receiverId: { type: String, required: true, ref: 'User' },
    content: { type: String, required: true },
    type: {
      type: String,
      enum: ['text', 'system', 'commission_proposal'],
      default: 'text'
    },
    metadata: { type: Schema.Types.Mixed },
    readAt: String
  },
  { timestamps: true }
);

const CommissionHistorySchema = new Schema(
  {
    holderId: { type: String, required: true, ref: 'User' },
    previousRate: { type: Number, required: true },
    newRate: { type: Number, required: true },
    basis: { type: String, required: true },
    targetApplicantId: String,
    changedById: { type: String, required: true },
    reason: String,
    timestamp: { type: String, required: true }
  },
  { timestamps: true }
);

const NotificationSchema = new Schema(
  {
    userId: { type: String, required: true, ref: 'User' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, required: true },
    referenceId: String,
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const AuditLogSchema = new Schema(
  {
    actorId: { type: String, required: true },
    action: { type: String, required: true },
    details: { type: Schema.Types.Mixed },
    ipAddress: String,
    timestamp: { type: String, required: true }
  },
  { timestamps: true }
);

export const MongoUserModel = mongoose.models.User || mongoose.model('User', UserSchema);
export const MongoPokeModel = mongoose.models.PokeRequest || mongoose.model('PokeRequest', PokeRequestSchema);
export const MongoConnectionModel = mongoose.models.Connection || mongoose.model('Connection', ConnectionSchema);
export const MongoMessageModel = mongoose.models.Message || mongoose.model('Message', MessageSchema);
export const MongoCommissionModel = mongoose.models.CommissionHistory || mongoose.model('CommissionHistory', CommissionHistorySchema);
export const MongoNotificationModel = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
export const MongoAuditModel = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
