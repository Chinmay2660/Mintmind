import mongoose from 'mongoose';

const NomineeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  relationship: {
    type: String,
    enum: ['spouse', 'parent', 'child', 'sibling', 'friend', 'other'],
    default: 'other',
  },
  notes: { type: String },
}, { timestamps: true });

export default mongoose.models.Nominee || mongoose.model('Nominee', NomineeSchema);
