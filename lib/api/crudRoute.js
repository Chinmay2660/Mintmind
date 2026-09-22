import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAuth, pick, safeErrorResponse } from '@/lib/middleware/api';

export function createCrudHandlers(Model, fields, opts = {}) {
  const { sort = { createdAt: -1 }, validate, transform, filterQuery } = opts;

  return {
    async GET(request) {
      try {
        await connectDB();
        const { user, response } = await requireAuth();
        if (response) return response;
        const { searchParams } = new URL(request.url);
        const query = { userId: user._id };
        if (filterQuery) Object.assign(query, filterQuery(searchParams));
        const items = await Model.find(query).sort(sort);
        return NextResponse.json(items);
      } catch (error) {
        return safeErrorResponse(error, `Failed to fetch ${Model.modelName}`);
      }
    },

    async POST(request) {
      try {
        await connectDB();
        const { user, response } = await requireAuth();
        if (response) return response;
        const body = await request.json();
        const data = pick(body, fields);
        if (validate) {
          const err = validate(data);
          if (err) return NextResponse.json({ error: err }, { status: 400 });
        }
        const payload = transform ? transform(data, body) : data;
        const item = await Model.create({ ...payload, userId: user._id });
        return NextResponse.json(item);
      } catch (error) {
        return safeErrorResponse(error, `Failed to create ${Model.modelName}`);
      }
    },
  };
}

export function createCrudIdHandlers(Model, fields, opts = {}) {
  const { validate, transform } = opts;

  return {
    async GET(request, { params }) {
      try {
        const { id } = await params;
        await connectDB();
        const { user, response } = await requireAuth();
        if (response) return response;
        const item = await Model.findOne({ _id: id, userId: user._id });
        if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(item);
      } catch (error) {
        return safeErrorResponse(error, `Failed to fetch ${Model.modelName}`);
      }
    },

    async PUT(request, { params }) {
      try {
        const { id } = await params;
        await connectDB();
        const { user, response } = await requireAuth();
        if (response) return response;
        const body = await request.json();
        const data = pick(body, fields);
        if (validate) {
          const err = validate(data);
          if (err) return NextResponse.json({ error: err }, { status: 400 });
        }
        const payload = transform ? transform(data, body) : data;
        const item = await Model.findOneAndUpdate({ _id: id, userId: user._id }, payload, { new: true });
        if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(item);
      } catch (error) {
        return safeErrorResponse(error, `Failed to update ${Model.modelName}`);
      }
    },

    async DELETE(request, { params }) {
      try {
        const { id } = await params;
        await connectDB();
        const { user, response } = await requireAuth();
        if (response) return response;
        const item = await Model.findOneAndDelete({ _id: id, userId: user._id });
        if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json({ message: 'Deleted' });
      } catch (error) {
        return safeErrorResponse(error, `Failed to delete ${Model.modelName}`);
      }
    },
  };
}
