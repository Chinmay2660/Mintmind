import mongoose from 'mongoose';

const MFTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  investmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Investment', required: true, index: true },
  type: { type: String, enum: ['buy', 'sip', 'sell'], required: true },
  date: { type: Date, required: true },
  units: { type: Number, required: true, min: 0 },
  nav: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
  notes: { type: String },
}, { timestamps: true });

export default mongoose.models.MFTransaction || mongoose.model('MFTransaction', MFTransactionSchema);
