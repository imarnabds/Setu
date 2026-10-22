import { storage } from './services/storage.js';
import { hashPassword } from './utils/security.js';
import {
  User,
  PokeRequest,
  Connection,
  Message,
  CommissionHistory,
  Notification
} from './models/types.js';

export const seedDatabase = async () => {
  console.log('[Seed] Checking if database needs initial demo seed...');
  const existingUsers = storage.getAllUsers();
  if (existingUsers.length > 0) {
    console.log(`[Seed] Database already contains ${existingUsers.length} users. Skipping seed.`);
    return;
  }

  console.log('[Seed] Seeding realistic demo users, pokes, connections, and audit data...');

  const commonPassword = await hashPassword('Password123!');
  const adminPassword = await hashPassword('AdminSecure2025!');
  const now = new Date().toISOString();
  const pastDay = new Date(Date.now() - 86400000).toISOString();
  const pastTwoDays = new Date(Date.now() - 172800000).toISOString();

  // 1. Demat Account Holders
  const holder1: User = {
    id: 'usr_holder_rajesh',
    fullName: 'Rajesh Sharma',
    email: 'rajesh.sharma@demat.in',
    mobileNumber: '+91 98201 12345',
    password: commonPassword,
    primaryRole: 'demat_holder',
    isEmailVerified: true,
    isMobileVerified: true,
    isKycVerified: true,
    kycDetails: {
      documentType: 'PAN & NSDL Demat Statement',
      documentNumberMasked: 'XXXX-XXXX-3412',
      submittedAt: pastTwoDays,
      status: 'verified',
      verifiedAt: pastDay,
      notes: 'Verified against NSDL/CDSL registry benchmark'
    },
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    city: 'Mumbai',
    region: 'Maharashtra',
    bio: 'Active Demat account holder with 6+ years in Indian primary markets. Specializes in Mainboard & SME IPO allocation workflows and cut-off price strategies.',
    investmentExperience: '6+ Years Experience',
    preferredLanguage: 'English, Hindi, Marathi',
    supportedCategories: ['Mainboard IPO', 'SME IPO', 'Retail Bidding Strategy', 'Cut-Off Price Guidance'],
    defaultCommissionRate: 5.0,
    commissionBasis: 'Documented Advisory & Technical Assistance Base Fee',
    isAvailable: true,
    createdAt: pastTwoDays,
    updatedAt: pastDay
  };

  const holder2: User = {
    id: 'usr_holder_priya',
    fullName: 'Priya Patel',
    email: 'priya.patel@demat.in',
    mobileNumber: '+91 98791 54321',
    password: commonPassword,
    primaryRole: 'demat_holder',
    isEmailVerified: true,
    isMobileVerified: true,
    isKycVerified: true,
    kycDetails: {
      documentType: 'PAN & CDSL Demat Statement',
      documentNumberMasked: 'XXXX-XXXX-9876',
      submittedAt: pastTwoDays,
      status: 'verified',
      verifiedAt: pastDay,
      notes: 'Verified Demat ownership and KYC credentials'
    },
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    city: 'Ahmedabad',
    region: 'Gujarat',
    bio: 'Passionate financial researcher and active retail IPO applicant. Focused on transparent compliance, category eligibility, and timetable tracking.',
    investmentExperience: '4 Years Experience',
    preferredLanguage: 'English, Hindi, Gujarati',
    supportedCategories: ['Mainboard IPO', 'Retail Application Strategy', 'HNI Allocation Assistance'],
    defaultCommissionRate: 7.5,
    commissionBasis: 'Fixed Advisory Service Fee Base',
    isAvailable: true,
    createdAt: pastTwoDays,
    updatedAt: pastDay
  };

  const holder3: User = {
    id: 'usr_holder_vikram',
    fullName: 'Vikram Mehta',
    email: 'vikram.mehta@demat.in',
    mobileNumber: '+91 99000 88776',
    password: commonPassword,
    primaryRole: 'demat_holder',
    isEmailVerified: true,
    isMobileVerified: true,
    isKycVerified: false,
    kycDetails: {
      documentType: 'PAN Card & Broker Holding Sheet',
      documentNumberMasked: 'XXXX-XXXX-4433',
      submittedAt: pastDay,
      status: 'pending',
      notes: 'Under review by compliance officer'
    },
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    city: 'Bengaluru',
    region: 'Karnataka',
    bio: 'Tech professional and long-time investor. Offering friendly guidance on UPI mandate approvals and allotment probability checks.',
    investmentExperience: '3 Years Experience',
    preferredLanguage: 'English, Kannada, Hindi',
    supportedCategories: ['Mainboard IPO', 'UPI Mandate Troubleshooting', 'Bid Modification Support'],
    defaultCommissionRate: 2.5,
    commissionBasis: 'Technical Consultation Base Fee',
    isAvailable: true,
    createdAt: pastDay,
    updatedAt: pastDay
  };

  // 2. Investors
  const investor1: User = {
    id: 'usr_investor_arjun',
    fullName: 'Arjun Kapoor',
    email: 'arjun.kapoor@investor.in',
    mobileNumber: '+91 98210 65432',
    password: commonPassword,
    primaryRole: 'investor',
    isEmailVerified: true,
    isMobileVerified: true,
    isKycVerified: true,
    kycDetails: {
      documentType: 'Aadhaar & PAN',
      documentNumberMasked: 'XXXX-XXXX-7721',
      submittedAt: pastTwoDays,
      status: 'verified',
      verifiedAt: pastDay
    },
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    city: 'Pune',
    region: 'Maharashtra',
    bio: 'Individual retail investor looking to connect with reliable Demat holders for IPO allotment insights and bidding strategies.',
    investmentExperience: '1-2 Years',
    preferredLanguage: 'English, Hindi',
    supportedCategories: ['Mainboard IPO', 'Retail Application Strategy'],
    defaultCommissionRate: 0,
    commissionBasis: 'Client Investor',
    isAvailable: true,
    createdAt: pastTwoDays,
    updatedAt: pastDay
  };

  const investor2: User = {
    id: 'usr_investor_neha',
    fullName: 'Neha Verma',
    email: 'neha.verma@investor.in',
    mobileNumber: '+91 98110 33221',
    password: commonPassword,
    primaryRole: 'investor',
    isEmailVerified: true,
    isMobileVerified: true,
    isKycVerified: false,
    kycDetails: {
      documentType: 'PAN Card',
      documentNumberMasked: 'XXXX-XXXX-1199',
      submittedAt: pastDay,
      status: 'pending'
    },
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
    city: 'New Delhi',
    region: 'Delhi NCR',
    bio: 'First-time IPO enthusiast eager to learn lawful application practices and how to avoid mandate rejections.',
    investmentExperience: 'Beginner',
    preferredLanguage: 'English, Hindi',
    supportedCategories: ['Mainboard IPO'],
    defaultCommissionRate: 0,
    commissionBasis: 'Client Investor',
    isAvailable: true,
    createdAt: pastDay,
    updatedAt: pastDay
  };

  // 3. Admin User
  const adminUser: User = {
    id: 'usr_admin_compliance',
    fullName: 'Compliance & Verification Desk',
    email: 'compliance.admin@ipoconnect.in',
    mobileNumber: '+91 99999 00000',
    password: adminPassword,
    primaryRole: 'admin',
    isEmailVerified: true,
    isMobileVerified: true,
    isKycVerified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
    city: 'Mumbai',
    region: 'Maharashtra',
    bio: 'Setu Official Compliance & Audit Administrator',
    supportedCategories: ['Platform Compliance', 'KYC Review', 'Security Audit'],
    defaultCommissionRate: 0,
    commissionBasis: 'Platform Administration',
    isAvailable: true,
    createdAt: pastTwoDays,
    updatedAt: pastDay
  };

  storage.createUser(holder1);
  storage.createUser(holder2);
  storage.createUser(holder3);
  storage.createUser(investor1);
  storage.createUser(investor2);
  storage.createUser(adminUser);

  // 4. Sample Poke Requests
  // Poke 1: Accepted between Arjun (Investor) and Rajesh (Holder)
  const poke1: PokeRequest = {
    id: 'poke_arjun_to_rajesh',
    senderId: investor1.id,
    recipientId: holder1.id,
    senderRole: 'investor',
    recipientRole: 'demat_holder',
    status: 'accepted',
    proposedCommissionRate: 5.0,
    commissionBasis: holder1.commissionBasis,
    message: 'Hi Rajesh, I noticed your extensive experience with SME IPO cut-off strategies. Would love to connect and discuss lawful assistance for the upcoming tech IPO.',
    agreedCommissionRate: 5.0,
    agreedCommissionBasis: holder1.commissionBasis,
    acceptedAt: pastDay,
    createdAt: pastTwoDays,
    updatedAt: pastDay
  };

  // Poke 2: Pending from Neha (Investor) to Rajesh (Holder)
  const poke2: PokeRequest = {
    id: 'poke_neha_to_rajesh',
    senderId: investor2.id,
    recipientId: holder1.id,
    senderRole: 'investor',
    recipientRole: 'demat_holder',
    status: 'pending',
    proposedCommissionRate: 5.0,
    commissionBasis: holder1.commissionBasis,
    message: 'Hello Mr. Sharma, I am preparing for my first Mainboard IPO application and would appreciate your technical guidance.',
    createdAt: pastDay,
    updatedAt: pastDay
  };

  // Poke 3: Pending from Arjun (Investor) to Priya (Holder)
  const poke3: PokeRequest = {
    id: 'poke_arjun_to_priya',
    senderId: investor1.id,
    recipientId: holder2.id,
    senderRole: 'investor',
    recipientRole: 'demat_holder',
    status: 'pending',
    proposedCommissionRate: 7.5,
    commissionBasis: holder2.commissionBasis,
    message: 'Hi Priya, interested in your HNI allocation assistance parameters. Looking forward to connecting!',
    createdAt: pastDay,
    updatedAt: pastDay
  };

  storage.createPoke(poke1);
  storage.createPoke(poke2);
  storage.createPoke(poke3);

  // 5. Active Connection for Poke 1
  const connection1: Connection = {
    id: 'conn_rajesh_arjun',
    userAId: holder1.id,
    userBId: investor1.id,
    pokeRequestId: poke1.id,
    agreedCommissionRate: 5.0,
    agreedCommissionBasis: holder1.commissionBasis,
    status: 'active',
    createdAt: pastDay,
    updatedAt: now
  };
  storage.createConnection(connection1);

  // 6. Messages for Connection 1
  const msg1: Message = {
    id: 'msg_sys_1',
    connectionId: connection1.id,
    senderId: 'system',
    receiverId: investor1.id,
    content: '🤝 Connection established! Agreed terms: 5.0% on [Documented Advisory & Technical Assistance Base Fee]. Compliance Reminder: All IPO applications must use authorized channels (ASBA/UPI/Broker). Never share trading credentials, bank OTPs, or UPI PINs.',
    type: 'system',
    metadata: { agreedRate: 5.0, basis: holder1.commissionBasis },
    createdAt: pastDay
  };

  const msg2: Message = {
    id: 'msg_txt_2',
    connectionId: connection1.id,
    senderId: investor1.id,
    receiverId: holder1.id,
    content: 'Hello Rajesh! Thank you for accepting my Poke request. I am looking at the upcoming solar manufacturing IPO.',
    type: 'text',
    createdAt: pastDay
  };

  const msg3: Message = {
    id: 'msg_txt_3',
    connectionId: connection1.id,
    senderId: holder1.id,
    receiverId: investor1.id,
    content: 'Glad to connect, Arjun! That issue has strong institutional interest. I can guide you on retail price band cut-offs and how to confirm UPI mandate approval on time.',
    type: 'text',
    createdAt: pastDay
  };

  storage.createMessage(msg1);
  storage.createMessage(msg2);
  storage.createMessage(msg3);

  // 7. Commission History Entry
  const commHistory1: CommissionHistory = {
    id: 'ch_hist_1',
    holderId: holder1.id,
    previousRate: 2.5,
    newRate: 5.0,
    basis: holder1.commissionBasis,
    changedById: holder1.id,
    reason: 'Adjusted default published advisory rate for upcoming financial year',
    timestamp: pastDay
  };
  storage.createCommissionHistory(commHistory1);

  // 8. Notifications
  storage.createNotification({
    id: 'notif_1',
    userId: holder1.id,
    title: 'New Poke Received',
    message: 'Neha Verma sent you a Poke request. Review their profile to accept or decline.',
    type: 'poke_received',
    referenceId: poke2.id,
    isRead: false,
    createdAt: pastDay
  });

  storage.createNotification({
    id: 'notif_2',
    userId: investor1.id,
    title: 'Poke Accepted!',
    message: 'Rajesh Sharma accepted your Poke! Private chat is now active.',
    type: 'poke_accepted',
    referenceId: connection1.id,
    isRead: true,
    createdAt: pastDay
  });

  // 9. Audit Logs
  storage.createAuditLog({
    id: 'aud_seed_1',
    actorId: 'usr_admin_compliance',
    action: 'PLATFORM_INITIALIZED',
    details: { environment: 'production-ready', seeded: true },
    timestamp: pastTwoDays
  });

  console.log('[Seed] Database successfully seeded with demo accounts!');
};
