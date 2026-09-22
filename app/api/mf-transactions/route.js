import MFTransaction from '@/models/MFTransaction';
import { createCrudHandlers } from '@/lib/api/crudRoute';

const FIELDS = ['investmentId', 'type', 'date', 'units', 'nav', 'amount', 'notes'];
const handlers = createCrudHandlers(MFTransaction, FIELDS, {
  sort: { date: -1 },
  filterQuery: (sp) => {
    const q = {};
    const invId = sp.get('investmentId');
    if (invId) q.investmentId = invId;
    return q;
  },
  validate: (d) => (!d.investmentId || !d.units || !d.nav ? 'Investment, units, and NAV are required' : null),
});

export const GET = handlers.GET;
export const POST = handlers.POST;
