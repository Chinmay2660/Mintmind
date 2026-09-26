import mongoose from 'mongoose';
import BankAccount from './BankAccount.js';

export const DEBIT_CARD_NETWORKS = ['Visa', 'Mastercard', 'RuPay', 'Amex', 'Other'];

/** ponytail: debit cards only store the last 4 digits; they draw from their bank account and never hold a balance. */
const DebitCardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount', required: true },
  cardName: { type: String, default: '' },
  network: { type: String, enum: DEBIT_CARD_NETWORKS, default: 'Visa' },
  lastFourDigits: { type: String, default: '' },
  expiry: { type: String, default: '' },
  atmLimit: { type: Number },
  notes: { type: String, default: '' },
}, {
  timestamps: true,
});

DebitCardSchema.index({ userId: 1, accountId: 1 });

export const DEBIT_CARD_FIELDS = ['accountId', 'cardName', 'network', 'lastFourDigits', 'expiry', 'atmLimit', 'notes'];

const EXPIRY_RE = /^(0[1-9]|1[0-2])\/\d{2}$/;

/** Normalises client input; returns { error } when a field is invalid. */
export function normalizeDebitCardInput(data) {
  if (data.lastFourDigits != null) {
    data.lastFourDigits = String(data.lastFourDigits).replace(/\D/g, '');
    if (data.lastFourDigits && data.lastFourDigits.length !== 4) {
      return { error: 'Enter only the last 4 digits of the card' };
    }
  }
  if (data.expiry != null) {
    data.expiry = String(data.expiry).trim();
    if (data.expiry && !EXPIRY_RE.test(data.expiry)) {
      return { error: 'Expiry must be MM/YY' };
    }
  }
  if (data.network != null && !DEBIT_CARD_NETWORKS.includes(data.network)) {
    data.network = 'Other';
  }
  if (data.atmLimit === '' || data.atmLimit === null) {
    data.atmLimit = undefined;
  } else if (data.atmLimit != null) {
    const limit = Number(data.atmLimit);
    if (!Number.isFinite(limit) || limit < 0) return { error: 'ATM limit must be a positive number' };
    data.atmLimit = limit;
  }
  return { data };
}

/** Debit cards may only link to the user's own non-credit-card accounts. */
export async function ownsDebitableAccount(userId, accountId) {
  if (!mongoose.isValidObjectId(accountId)) return false;
  return Boolean(await BankAccount.exists({ _id: accountId, userId, accountType: { $ne: 'Credit Card' } }));
}

export default mongoose.models.DebitCard || mongoose.model('DebitCard', DebitCardSchema);
