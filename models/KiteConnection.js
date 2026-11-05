import mongoose from 'mongoose'

// Per-user Zerodha Kite Connect session. Kite access tokens are valid for one trading day only
// (they expire around 6 AM IST), so there is no refresh token: the user logs in again each day.
// The token is encrypted at rest (AES-256-GCM via ENCRYPTION_KEY) and never sent to the browser.
const KiteConnectionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    accessTokenEnc: { type: String, required: true, select: false },
    kiteUserId: { type: String },
    kiteUserName: { type: String },
    connectedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    lastSyncAt: { type: Date },
  },
  { timestamps: true }
)

export default mongoose.models.KiteConnection || mongoose.model('KiteConnection', KiteConnectionSchema)
