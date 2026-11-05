import mongoose from 'mongoose'

// Privacy model: `permissions` on a member are set by THAT member and control what the rest of the
// circle may see about them. Admins manage membership (invite/remove/roles) but never get automatic
// access to anyone's data. Only the summary figures a member chose to share are ever stored here.
const PermissionsSchema = new mongoose.Schema(
  {
    netWorth: { type: Boolean, default: false },
    overview: { type: Boolean, default: false },
    bank: { type: Boolean, default: false },
    mutualFunds: { type: Boolean, default: false },
    insurance: { type: Boolean, default: false },
    documents: { type: Boolean, default: false },
    emergencyOnly: { type: Boolean, default: false },
  },
  { _id: false }
)

const MemberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: { type: String, required: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  relation: { type: String, trim: true },
  role: { type: String, enum: ['admin', 'member', 'emergency_contact'], default: 'member' },
  status: { type: String, enum: ['invited', 'active'], default: 'invited' },
  inviteTokenHash: { type: String, select: false },
  inviteExpires: { type: Date },
  permissions: { type: PermissionsSchema, default: () => ({}) },
  summary: { type: mongoose.Schema.Types.Mixed },
  joinedAt: { type: Date },
})

const FamilyCircleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [MemberSchema],
  },
  { timestamps: true }
)

FamilyCircleSchema.index({ 'members.userId': 1 })
FamilyCircleSchema.index({ 'members.email': 1 })
FamilyCircleSchema.index({ 'members.inviteTokenHash': 1 }, { sparse: true })

export default mongoose.models.FamilyCircle || mongoose.model('FamilyCircle', FamilyCircleSchema)
