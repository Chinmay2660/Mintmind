import mongoose from 'mongoose'

// Age is optional and private: only the owner can read it and it is never part of anything shared with family.
// No country or currency is collected; amounts are always shown in INR.
const UserOnboardingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    onboardingCompleted: { type: Boolean, default: false },
    selectedGoals: [{ type: String }],
    selectedPackage: { type: String },
    trackingNeeds: { type: String },
    age: { type: Number, min: 18, max: 120 },
    mobile: { type: String },
    preferredTheme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    notificationPreference: { type: String, enum: ['daily', 'weekly', 'monthly', 'important'], default: 'important' },
    completedAt: { type: Date },
  },
  { timestamps: true }
)

export default mongoose.models.UserOnboarding || mongoose.model('UserOnboarding', UserOnboardingSchema)
