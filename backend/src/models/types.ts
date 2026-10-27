export type UserRole = 'investor' | 'demat_holder' | 'admin';

export type KycStatus = 'none' | 'pending' | 'verified' | 'rejected';

export interface KycDetails {
  documentType: string;
  documentNumberMasked: string;
  submittedAt: string;
  status: KycStatus;
  notes?: string;
  verifiedAt?: string;
  livePhotoUrl?: string;
  aadhaarNumber?: string;
  aadhaarFrontUrl?: string;
  aadhaarBackUrl?: string;
  panNumber?: string;
  panCardUrl?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  password: string; // hashed
  primaryRole: UserRole;
  isEmailVerified: boolean;
  isMobileVerified: boolean;
  isKycVerified: boolean;
  emailOtpCode?: string;
  emailOtpExpiresAt?: string;
  kycDetails?: KycDetails;
  avatarUrl?: string;
  city?: string;
  region?: string;
  bio?: string;
  investmentExperience?: string;
  preferredLanguage?: string;
  supportedCategories: string[];
  defaultCommissionRate: number; // 0 to 50 in 2.5% increments
  commissionBasis: string;
  isAvailable: boolean;
  upiId?: string;
  isUpiVerified?: boolean;
  upiVerifiedAt?: string;
  refreshToken?: string;
  createdAt: string;
  updatedAt: string;
}

export type IpoLifecycleStatus = 'Upcoming' | 'Open' | 'Closed' | 'Listed';

export interface IPO {
  id: string; // Database ID / Upstox identifier
  name: string; // IPO Name
  status: IpoLifecycleStatus; // 'Upcoming' | 'Open' | 'Closed' | 'Listed'
  lastUpdated: string; // ISO timestamp of synchronization
  isStale?: boolean; // True if provider API failed or threshold exceeded
  isVerified?: boolean; // True for live provider verified records; false for preserved demo
  isArchived?: boolean; // True for preserved historical records not in active provider feed
  source?: string; // 'upstox' | 'demo_preserved' | 'local_sync'
  createdAt: string;
  updatedAt: string;
}

export interface IpoSyncMeta {
  lastSyncedAt: string;
  isStale: boolean;
  syncStatus: 'synced' | 'stale' | 'failed' | 'unauthorized';
  syncError?: string | null;
  totalOfferings: number;
  insertedCount?: number;
  updatedCount?: number;
  archivedCount?: number;
}

export type PokeStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';

export interface PokeRequest {
  id: string;
  senderId: string;
  recipientId: string;
  senderRole: UserRole;
  recipientRole: UserRole;
  ipoId?: string;
  ipoName?: string;
  status: PokeStatus;
  proposedCommissionRate?: number;
  commissionBasis?: string;
  message?: string;
  rejectionReason?: string;
  agreedCommissionRate?: number;
  agreedCommissionBasis?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConnectionStatus = 'active' | 'disconnected' | 'blocked';

export interface Connection {
  id: string;
  ipoId: string;
  ipoName: string;
  userAId: string; // Typically Demat Holder
  userBId: string; // Typically Investor
  pokeRequestId: string;
  agreedCommissionRate: number;
  agreedCommissionBasis: string;
  status: ConnectionStatus;
  blockedById?: string;
  dematHolderUpi?: {
    upiId: string | null;
    isUpiVerified: boolean;
    hasUpi: boolean;
    upiVerifiedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type MessageType = 'text' | 'system' | 'commission_proposal';

export interface Message {
  id: string;
  connectionId: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: MessageType;
  metadata?: Record<string, any>;
  readAt?: string;
  createdAt: string;
}

export interface CommissionHistory {
  id: string;
  holderId: string;
  previousRate: number;
  newRate: number;
  basis: string;
  targetApplicantId?: string; // null if default
  changedById: string;
  reason?: string;
  timestamp: string;
}

export type NotificationType =
  | 'poke_received'
  | 'poke_accepted'
  | 'poke_rejected'
  | 'poke_cancelled'
  | 'message_received'
  | 'commission_updated'
  | 'kyc_status'
  | 'system';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  details: Record<string, any>;
  ipAddress?: string;
  timestamp: string;
}
