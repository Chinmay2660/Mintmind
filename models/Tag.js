import mongoose from 'mongoose';

const TagSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  color: { type: String, default: '#6366f1' },
}, { timestamps: true });

TagSchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.models.Tag || mongoose.model('Tag', TagSchema);
