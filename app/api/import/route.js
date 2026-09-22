import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAuth, safeErrorResponse } from '@/lib/middleware/api';
import Transaction from '@/models/Transaction';
import * as XLSX from 'xlsx';

export async function POST(request) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const formData = await request.formData();
    const file = formData.get('file');
    const type = formData.get('type') || 'transactions';
    const preview = formData.get('preview') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const errors = [];
    const valid = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (type === 'transactions') {
        const amount = parseFloat(row.Amount || row.amount);
        const txType = (row.Type || row.type || 'expense').toLowerCase();
        if (!amount || amount <= 0) {
          errors.push({ row: i + 2, error: 'Invalid amount' });
          continue;
        }
        valid.push({
          type: txType,
          amount,
          description: row.Description || row.description || '',
          date: row.Date || row.date ? new Date(row.Date || row.date) : new Date(),
        });
      }
    }

    if (preview) {
      return NextResponse.json({ total: rows.length, valid: valid.length, errors, preview: valid.slice(0, 10) });
    }

    const created = [];
    for (const data of valid) {
      const tx = await Transaction.create({ ...data, userId: user._id });
      created.push(tx);
    }

    return NextResponse.json({ imported: created.length, errors: errors.length, errorDetails: errors });
  } catch (error) {
    return safeErrorResponse(error, 'Failed to import data');
  }
}
