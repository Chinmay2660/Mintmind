import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  frequency: { type: String, enum: ['weekly', 'monthly', 'quarterly', 'yearly'], default: 'monthly' },
  nextBillingDate: { type: Date },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
  status: { type: String, enum: ['active', 'paused', 'cancelled'], default: 'active' },
  notes: { type: String },
}, { timestamps: true });

export default mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema);
