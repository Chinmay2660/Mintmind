import mongoose from 'mongoose';

const EmergencyFundSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  currentAmount: { type: Number, default: 0, min: 0 },
  targetAmount: { type: Number, required: true, min: 0 },
  monthlyContribution: { type: Number, default: 0, min: 0 },
  monthlyExpenses: { type: Number, default: 0, min: 0 },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
}, { timestamps: true });

export default mongoose.models.EmergencyFund || mongoose.model('EmergencyFund', EmergencyFundSchema);
