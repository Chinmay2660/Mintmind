import mongoose from 'mongoose'

// Shared price cache (NAVs and equity last prices). Not per-user: nothing here identifies anyone.
const MarketPriceSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // mf:<source id> | eq:NSE:INFY
    kind: { type: String, enum: ['mf', 'equity'], required: true },
    source: { type: String, enum: ['amfi', 'kite'], required: true },
    schemeCode: { type: String },
    symbol: { type: String, index: true },
    isins: { type: [String], index: true },
    name: { type: String },
    nameKey: { type: String, index: true },
    price: { type: Number, required: true },
    priceDate: { type: String }, // ISO date the price is for
  },
  { timestamps: true }
)

export default mongoose.models.MarketPrice || mongoose.model('MarketPrice', MarketPriceSchema)
