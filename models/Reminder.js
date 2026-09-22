import mongoose from 'mongoose';

const ReminderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  type: { type: String, enum: ['emi', 'credit_card', 'insurance', 'investment', 'sip', 'bill', 'subscription', 'policy', 'loan', 'other'], default: 'other' },
  dueDate: { type: Date, required: true },
  amount: { type: Number, min: 0 },
  status: { type: String, enum: ['upcoming', 'today', 'overdue', 'completed'], default: 'upcoming' },
  linkedId: { type: mongoose.Schema.Types.ObjectId },
  linkedType: { type: String },
  notes: { type: String },
}, { timestamps: true });

ReminderSchema.index({ userId: 1, dueDate: 1 });

export default mongoose.models.Reminder || mongoose.model('Reminder', ReminderSchema);
