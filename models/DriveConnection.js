import mongoose from 'mongoose'

// Per-user Google Drive link. Only the long-lived refresh token is stored, encrypted (AES-256-GCM,
// ENCRYPTION_KEY). Access tokens are minted on demand and never persisted or sent to the browser.
const DriveConnectionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    refreshTokenEnc: { type: String, required: true, select: false },
    scope: { type: String },
    email: { type: String },
    status: { type: String, enum: ['connected', 'expired'], default: 'connected' },
    rootFolderId: { type: String },
    folders: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

export default mongoose.models.DriveConnection || mongoose.model('DriveConnection', DriveConnectionSchema)
