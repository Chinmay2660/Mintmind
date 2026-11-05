import mongoose from 'mongoose'

const ContactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  mobile: { type: String, trim: true },
  relationship: { type: String, trim: true },
  kind: { type: String, enum: ['primary_nominee', 'secondary_nominee', 'emergency_contact', 'trusted_family'], default: 'emergency_contact' },
  priority: { type: Number, default: 1 },
  accepted: { type: Boolean, default: false },
  verified: { type: Boolean, default: false }, // identity verified through OTP when accepting
  tokenHash: { type: String, select: false },
  otpHash: { type: String, select: false },
  otpExpires: { type: Date },
  otpAttempts: { type: Number, default: 0 },
  notifiedAt: { type: Date },
})

// Passwords are never emailed or SMSed and never stored in plaintext. Vault emergency access is a
// ciphertext bundle created in the owner's browser; contacts need the Emergency Access Key (handed over
// offline by the owner) to decrypt it, and only after grace period + OTP verification.
const LegacyConfigSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    enabled: { type: Boolean, default: false },
    inactivityDays: { type: Number, default: 90, min: 7, max: 730 },
    reminderLeadDays: { type: Number, default: 7, min: 1, max: 60 },
    confirmDays: { type: Number, default: 7, min: 1, max: 60 },
    graceDays: { type: Number, default: 14, min: 1, max: 90 },
    channels: { email: { type: Boolean, default: true }, push: { type: Boolean, default: true }, sms: { type: Boolean, default: false } },
    state: { type: String, enum: ['monitoring', 'reminded', 'awaiting_confirmation', 'contacts_notified', 'released'], default: 'monitoring' },
    lastActiveAt: { type: Date, default: Date.now },
    lastReminderAt: { type: Date },
    confirmDeadline: { type: Date },
    graceEndsAt: { type: Date },
    notifiedAt: { type: Date },
    releasedAt: { type: Date },
    contacts: [ContactSchema],
    package: {
      notes: { type: String, maxlength: 5000, default: '' },
      include: { netWorth: { type: Boolean, default: true }, accounts: { type: Boolean, default: false }, insurance: { type: Boolean, default: true }, documents: { type: Boolean, default: false } },
      snapshot: { type: mongoose.Schema.Types.Mixed }, // owner-prepared summary (no credentials)
    },
    vaultBundle: { iv: String, ct: String, itemCount: Number, grantedContactIds: [String], updatedAt: Date },
    pushSubscription: { type: mongoose.Schema.Types.Mixed, select: false },
    accessLog: [{ at: { type: Date, default: Date.now }, action: String, by: String, note: String }],
  },
  { timestamps: true }
)

LegacyConfigSchema.index({ 'contacts.tokenHash': 1 }, { sparse: true })
LegacyConfigSchema.index({ enabled: 1, state: 1 })

export default mongoose.models.LegacyConfig || mongoose.model('LegacyConfig', LegacyConfigSchema)
