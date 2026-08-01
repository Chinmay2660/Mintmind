import { requireAuth, pick, safeErrorResponse } from '@/lib/middleware/api';
import BankAccount from '@/models/BankAccount';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

const ACCOUNT_FIELDS = ['accountName', 'bankName', 'accountNumber', 'accountType', 'balance', 'color', 'icon'];

export async function GET() {
  try {
    const { user, response } = await requireAuth();
    if (response) return response;

    await connectDB();
    const accounts = await BankAccount.find({ userId: user._id }).sort({ createdAt: -1 });
    return NextResponse.json(accounts);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch bank accounts');
  }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth();
    if (response) return response;

    await connectDB();
    const body = await request.json();
    const data = pick(body, ACCOUNT_FIELDS);

    if (!data.accountName || !data.bankName) {
      return NextResponse.json({ error: 'Account name and bank name are required' }, { status: 400 });
    }

    const account = await BankAccount.create({
      ...data,
      userId: user._id,
    });

    return NextResponse.json(account);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to create bank account');
  }
}
