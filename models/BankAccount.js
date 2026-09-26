import mongoose from 'mongoose';

const BankAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  accountName: {
    type: String,
    required: true,
  },
  bankName: {
    type: String,
    required: true,
  },
  accountNumber: {
    type: String,
  },
  accountType: {
    type: String,
    enum: ['Savings', 'Salary', 'Current', 'Credit Card', 'Other'],
    default: 'Savings',
  },
  ownershipType: {
    type: String,
    enum: ['Individual', 'Joint'],
    default: 'Individual',
  },
  jointHolders: { type: String, default: '' },
  operationMode: { type: String, default: '' },
  ifscCode: { type: String, default: '' },
  branch: { type: String, default: '' },
  nomineeName: { type: String, default: '' },
  balance: {
    type: Number,
    default: 0,
    required: true,
  },
  color: {
    type: String,
    default: '#4845d2',
  },
  icon: {
    type: String,
    default: '🏦',
  },
}, {
  timestamps: true,
});

export const BANK_ACCOUNT_FIELDS = [
  'accountName', 'bankName', 'accountNumber', 'accountType', 'balance', 'color', 'icon',
  'ownershipType', 'jointHolders', 'operationMode', 'ifscCode', 'branch', 'nomineeName',
];

export const OPERATION_MODES = ['Either or Survivor', 'Former or Survivor', 'Jointly'];

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** Normalises client input; returns { error } when a field is invalid. */
export function normalizeBankAccountInput(data) {
  // Bank accounts have no user-entered name; it's always "Bank - Type". Credit-card mirrors keep the card name.
  if (typeof data.bankName === 'string' && data.bankName.trim() && data.accountType && data.accountType !== 'Credit Card') {
    data.accountName = `${data.bankName.trim()} - ${data.accountType}`;
    data.icon = '🏦';
  }
  if (typeof data.ifscCode === 'string') {
    data.ifscCode = data.ifscCode.trim().toUpperCase();
    if (data.ifscCode && !IFSC_RE.test(data.ifscCode)) {
      return { error: 'IFSC code must be 11 characters, like HDFC0001234' };
    }
  }
  if (data.ownershipType === 'Individual') {
    data.jointHolders = '';
    data.operationMode = '';
  } else if (data.ownershipType === 'Joint' && !OPERATION_MODES.includes(data.operationMode)) {
    data.operationMode = OPERATION_MODES[0];
  }
  return { data };
}

export default mongoose.models.BankAccount || mongoose.model('BankAccount', BankAccountSchema);

