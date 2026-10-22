import { z } from 'zod';
import { config } from '../config/index.js';

export const VALID_COMMISSION_RATES = config.validCommissionRates;

export const signupSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  mobileNumber: z.string().min(10, 'Mobile number must be at least 10 digits'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password is too long'),
  primaryRole: z.enum(['investor', 'demat_holder']),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the Terms of Service' })
  }),
  privacyAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the Privacy Policy' })
  })
});

export const loginSchema = z.object({
  identifier: z.string().min(3, 'Email or mobile number is required'),
  password: z.string().min(1, 'Password is required')
});

export const profileUpdateSchema = z.object({
  fullName: z.string().min(2).optional(),
  city: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  bio: z.string().max(1000).optional(),
  investmentExperience: z.string().max(100).optional(),
  preferredLanguage: z.string().max(50).optional(),
  supportedCategories: z.array(z.string()).optional(),
  defaultCommissionRate: z
    .number()
    .refine((val) => VALID_COMMISSION_RATES.includes(val), {
      message: 'Commission rate must be in 2.5% increments between 0% and 50%'
    })
    .optional(),
  commissionBasis: z.string().max(200).optional(),
  isAvailable: z.boolean().optional(),
  avatarUrl: z.string().optional()
});

export const commissionUpdateSchema = z.object({
  rate: z.number().refine((val) => VALID_COMMISSION_RATES.includes(val), {
    message: 'Commission rate must be a valid 2.5% increment between 0% and 50%'
  }),
  basis: z.string().min(2, 'Commission calculation basis must be specified'),
  reason: z.string().max(500).optional(),
  targetApplicantId: z.string().optional()
});

export const pokeCreateSchema = z.object({
  recipientId: z.string().min(1, 'Recipient ID is required'),
  message: z.string().max(500).optional(),
  proposedCommissionRate: z
    .number()
    .refine((val) => VALID_COMMISSION_RATES.includes(val), {
      message: 'Proposed commission must be a valid 2.5% increment between 0% and 50%'
    })
    .optional(),
  commissionBasis: z.string().max(200).optional()
});

export const pokeAcceptSchema = z.object({
  agreedCommissionRate: z
    .number()
    .refine((val) => VALID_COMMISSION_RATES.includes(val), {
      message: 'Agreed commission must be a valid 2.5% increment between 0% and 50%'
    }),
  agreedCommissionBasis: z.string().min(2, 'Commission calculation basis is required')
});

export const pokeRejectSchema = z.object({
  rejectionReason: z.string().max(300).optional()
});

export const sendMessageSchema = z.object({
  connectionId: z.string().min(1, 'Connection ID is required'),
  content: z.string().min(1, 'Message cannot be empty').max(2000, 'Message is too long')
});

export const kycSubmitSchema = z.object({
  documentType: z.string().min(2, 'Document type is required'),
  documentNumberMasked: z.string().min(4, 'Masked document number is required')
});

export const kycReviewSchema = z.object({
  status: z.enum(['verified', 'rejected']),
  notes: z.string().max(500).optional()
});
