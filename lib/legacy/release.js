import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import LegacyPlan from '@/models/LegacyPlan';
import Nominee from '@/models/Nominee';
import BankAccount from '@/models/BankAccount';
import Cash from '@/models/Cash';
import Investment from '@/models/Investment';
import CreditCard from '@/models/CreditCard';
import Loan from '@/models/Loan';
import Insurance from '@/models/Insurance';
import PasswordEntry from '@/models/PasswordEntry';
import Document from '@/models/Document';
import { decrypt } from '@/lib/utils/crypto';
import { notifyNominee } from '@/lib/notifications';

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

export async function getOrCreateLegacyPlan(userId) {
  await connectDB();
  let plan = await LegacyPlan.findOne({ userId });
  if (!plan) {
    plan = await LegacyPlan.create({ userId });
  }
  return plan;
}

export async function recordActivity(userId) {
  const plan = await getOrCreateLegacyPlan(userId);
  const now = new Date();

  if (plan.enabled && !plan.released && plan.releaseMode === 'inactivity') {
    const gapMs = now - new Date(plan.lastActiveAt);
    const thresholdMs = plan.inactivityDays * 24 * 60 * 60 * 1000;
    if (gapMs >= thresholdMs) {
      return releasePlan(plan, 'inactivity_release', `Auto-released after ${plan.inactivityDays} days of inactivity`);
    }
  }

  plan.lastActiveAt = now;
  await plan.save();
  return plan;
}

export async function releasePlan(plan, action, note) {
  const token = generateToken();
  plan.released = true;
  plan.releasedAt = new Date();
  plan.accessToken = token;
  plan.releaseLog.push({ action, at: new Date(), note });
  await plan.save();

  let notification = null;
  const nominee = await Nominee.findOne({ userId: plan.userId });
  if (nominee) {
    notification = await notifyNominee({
      nomineeEmail: nominee.email,
      nomineeName: nominee.name,
      accessToken: token,
      note,
    });
  }

  return { plan, accessToken: token, notification };
}

export async function manualRelease(userId) {
  const plan = await getOrCreateLegacyPlan(userId);
  if (!plan.enabled) {
    throw new Error('Enable legacy access before releasing');
  }
  return releasePlan(plan, 'manual_release', 'Vault manually released by account owner');
}

export async function revokeRelease(userId) {
  const plan = await getOrCreateLegacyPlan(userId);
  plan.released = false;
  plan.releasedAt = undefined;
  plan.accessToken = undefined;
  plan.lastActiveAt = new Date();
  plan.releaseLog.push({ action: 'revoke', at: new Date(), note: 'Release revoked by account owner' });
  await plan.save();
  return plan;
}

async function computeNetWorth(userId) {
  const [accounts, cash, investments, creditCards, loans] = await Promise.all([
    BankAccount.find({ userId }),
    Cash.findOne({ userId }),
    Investment.find({ userId }),
    CreditCard.find({ userId }),
    Loan.find({ userId }),
  ]);

  const totalBankBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const totalCash = cash?.amount || 0;
  const totalInvestmentValue = investments.reduce(
    (sum, inv) => sum + (inv.currentValue ?? inv.amount ?? 0),
    0
  );
  const totalCreditDue = creditCards.reduce((sum, card) => sum + (card.currentBalance || 0), 0);
  const totalLoanOutstanding = loans.reduce((sum, loan) => sum + (loan.outstanding || 0), 0);
  const totalAssets = totalBankBalance + totalCash + totalInvestmentValue;
  const totalLiabilities = totalCreditDue + totalLoanOutstanding;

  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    totalBankBalance,
    totalCash,
    totalInvestmentValue,
    totalCreditDue,
    totalLoanOutstanding,
    accountCount: accounts.length,
    investmentCount: investments.length,
    creditCardCount: creditCards.length,
    loanCount: loans.length,
  };
}

export async function getReleasedVault(token) {
  await connectDB();
  const plan = await LegacyPlan.findOne({ accessToken: token, released: true });
  if (!plan) return null;

  const scopes = plan.accessScopes || {};
  const userId = plan.userId;
  const payload = { releasedAt: plan.releasedAt, scopes };

  if (scopes.netWorth) {
    payload.netWorth = await computeNetWorth(userId);
  }
  if (scopes.accounts) {
    const [accounts, cash] = await Promise.all([
      BankAccount.find({ userId }).select('accountName balance bankName accountType'),
      Cash.findOne({ userId }).select('amount'),
    ]);
    payload.accounts = accounts;
    payload.cash = cash;
  }
  if (scopes.investments) {
    payload.investments = await Investment.find({ userId }).select('name type amount currentValue investedDate');
  }
  if (scopes.loans) {
    payload.loans = await Loan.find({ userId }).select('name type lender outstanding emi interestRate');
  }
  if (scopes.insurance) {
    payload.insurance = await Insurance.find({ userId }).select('name type policyNumber coverageAmount premium renewalDate isActive');
  }
  if (scopes.passwords) {
    const entries = await PasswordEntry.find({ userId }).select('service username encryptedPassword url category notes');
    payload.passwords = entries.map((entry) => ({
      service: entry.service,
      username: entry.username,
      password: entry.encryptedPassword ? decrypt(entry.encryptedPassword) : '',
      url: entry.url,
      category: entry.category,
      notes: entry.notes,
    }));
  }
  if (scopes.documents) {
    payload.documents = await Document.find({ userId }).select('name category fileName fileSize mimeType notes fileUrl storageKey');
  }

  return payload;
}
