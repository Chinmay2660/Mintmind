import mongoose from 'mongoose';

const AccessScopesSchema = new mongoose.Schema({
  netWorth: { type: Boolean, default: true },
  accounts: { type: Boolean, default: true },
  investments: { type: Boolean, default: true },
  loans: { type: Boolean, default: true },
  insurance: { type: Boolean, default: true },
  passwords: { type: Boolean, default: true },
  documents: { type: Boolean, default: true },
}, { _id: false });

const ReleaseLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  at: { type: Date, default: Date.now },
  note: { type: String },
}, { _id: false });

const LegacyPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  enabled: { type: Boolean, default: false },
  releaseMode: { type: String, enum: ['inactivity', 'manual'], default: 'inactivity' },
  inactivityDays: { type: Number, default: 90, min: 30, max: 365 },
  lastActiveAt: { type: Date, default: Date.now },
  released: { type: Boolean, default: false },
  releasedAt: { type: Date },
  accessToken: { type: String },
  accessScopes: { type: AccessScopesSchema, default: () => ({}) },
  releaseLog: { type: [ReleaseLogSchema], default: [] },
}, { timestamps: true });

export default mongoose.models.LegacyPlan || mongoose.model('LegacyPlan', LegacyPlanSchema);
