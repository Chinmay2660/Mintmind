import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, enum: ['insurance', 'tax', 'investment', 'loan', 'receipt', 'identity', 'other'], default: 'other' },
  tagIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
  fileUrl: { type: String },
  storageKey: { type: String },
  fileName: { type: String },
  fileSize: { type: Number },
  mimeType: { type: String },
  notes: { type: String },
}, { timestamps: true });

export default mongoose.models.Document || mongoose.model('Document', DocumentSchema);
