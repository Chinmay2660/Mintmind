import mongoose from 'mongoose';

const RuleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  enabled: { type: Boolean, default: true },
  priority: { type: Number, default: 0 },
  conditions: {
    field: { type: String, enum: ['description', 'amount'], default: 'description' },
    operator: { type: String, enum: ['contains', 'equals', 'startsWith', 'greaterThan', 'lessThan'], default: 'contains' },
    value: { type: String, required: true },
  },
  actions: {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    subcategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    tagIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
    type: { type: String, enum: ['expense', 'income'] },
  },
}, { timestamps: true });

RuleSchema.index({ userId: 1, priority: -1 });

export default mongoose.models.Rule || mongoose.model('Rule', RuleSchema);
