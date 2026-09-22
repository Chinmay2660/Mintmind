import mongoose from 'mongoose';

const LoanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['home', 'personal', 'car', 'education', 'other'], default: 'home' },
  lender: { type: String },
  principal: { type: Number, required: true, min: 0 },
  outstanding: { type: Number, required: true, min: 0 },
  interestRate: { type: Number, required: true, min: 0 },
  emi: { type: Number, min: 0 },
  tenureMonths: { type: Number, min: 0 },
  remainingMonths: { type: Number, min: 0 },
  startDate: { type: Date },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
  notes: { type: String },
}, { timestamps: true });

export default mongoose.models.Loan || mongoose.model('Loan', LoanSchema);
