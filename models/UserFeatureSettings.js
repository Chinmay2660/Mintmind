import mongoose from 'mongoose'

// One row per user per feature. Disabling only flips isEnabled: the feature's own records are never touched.
const UserFeatureSettingsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    featureKey: { type: String, required: true },
    isEnabled: { type: Boolean, default: true },
    enabledAt: { type: Date },
    configuration: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)
UserFeatureSettingsSchema.index({ userId: 1, featureKey: 1 }, { unique: true })

export default mongoose.models.UserFeatureSettings || mongoose.model('UserFeatureSettings', UserFeatureSettingsSchema)
