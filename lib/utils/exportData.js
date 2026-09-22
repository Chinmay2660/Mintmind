import * as XLSX from 'xlsx';

export function toCSV(rows, columns) {
  const header = columns.map((c) => c.label).join(',');
  const body = rows.map((row) =>
    columns.map((c) => {
      const val = row[c.key];
      if (val == null) return '';
      const str = String(val);
      return str.includes(',') ? `"${str}"` : str;
    }).join(',')
  );
  return [header, ...body].join('\n');
}

export function toExcelBuffer(sheets) {
  const wb = XLSX.utils.book_new();
  for (const { name, rows, columns } of sheets) {
    const data = [columns.map((c) => c.label), ...rows.map((r) => columns.map((c) => r[c.key] ?? ''))];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

export const TRANSACTION_COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'type', label: 'Type' },
  { key: 'description', label: 'Description' },
  { key: 'amount', label: 'Amount' },
  { key: 'category', label: 'Category' },
  { key: 'account', label: 'Account' },
];

export const INVESTMENT_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type' },
  { key: 'amount', label: 'Invested' },
  { key: 'currentValue', label: 'Current Value' },
  { key: 'investedDate', label: 'Invested Date' },
];
