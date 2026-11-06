import mongoose from 'mongoose'

// One document per key. 'kite' holds the app-level Zerodha session (encrypted) and the last sync result.
const MarketMetaSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    accessTokenEnc: { type: String, select: false },
    expiresAt: { type: Date },
    lastSyncAt: { type: Date },
    lastResult: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
)

export default mongoose.models.MarketMeta || mongoose.model('MarketMeta', MarketMetaSchema)
