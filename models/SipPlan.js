import mongoose from 'mongoose';

const SipPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  investmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Investment' },
  schemeCode: { type: String },
  amount: { type: Number, required: true, min: 0 },
  frequency: { type: String, enum: ['monthly', 'quarterly'], default: 'monthly' },
  nextDate: { type: Date },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
  goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal' },
  status: { type: String, enum: ['active', 'paused', 'completed'], default: 'active' },
}, { timestamps: true });

export default mongoose.models.SipPlan || mongoose.model('SipPlan', SipPlanSchema);
