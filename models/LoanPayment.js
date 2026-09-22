import mongoose from 'mongoose';

const LoanPaymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  loanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', required: true, index: true },
  date: { type: Date, required: true, default: Date.now },
  amount: { type: Number, required: true, min: 0 },
  principalPaid: { type: Number, required: true, min: 0 },
  interestPaid: { type: Number, required: true, min: 0 },
  extraPrincipal: { type: Number, min: 0, default: 0 }, // above contractual EMI principal
  paymentType: {
    type: String,
    enum: ['emi', 'advance', 'prepayment', 'partial'],
    default: 'emi',
  },
  isCash: { type: Boolean, default: false },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
  notes: { type: String },
}, { timestamps: true });

export default mongoose.models.LoanPayment || mongoose.model('LoanPayment', LoanPaymentSchema);
