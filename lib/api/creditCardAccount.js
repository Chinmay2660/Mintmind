import BankAccount from '@/models/BankAccount';

/** ponytail: CC owed amount is positive on CreditCard, negative on BankAccount so expense tx math works */
function accountBalanceFromCard(card) {
  return -(card.currentBalance || 0);
}

export async function createAccountForCreditCard(userId, card) {
  return BankAccount.create({
    userId,
    accountName: card.cardName,
    bankName: card.issuer || 'Credit Card',
    accountNumber: card.lastFourDigits || '',
    accountType: 'Credit Card',
    balance: accountBalanceFromCard(card),
    color: card.color || '#7c3aed',
    icon: '💳',
  });
}

export async function syncAccountFromCreditCard(accountId, userId, card) {
  return BankAccount.findOneAndUpdate(
    { _id: accountId, userId },
    {
      accountName: card.cardName,
      bankName: card.issuer || 'Credit Card',
      accountNumber: card.lastFourDigits || '',
      accountType: 'Credit Card',
      balance: accountBalanceFromCard(card),
      color: card.color || '#7c3aed',
    },
    { new: true }
  );
}

export async function ensureCreditCardAccount(userId, card) {
  if (card.accountId) {
    await syncAccountFromCreditCard(card.accountId, userId, card);
    return card.accountId;
  }

  const account = await createAccountForCreditCard(userId, card);
  card.accountId = account._id;
  await card.save();
  return account._id;
}
