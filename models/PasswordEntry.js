import mongoose from 'mongoose';

const PasswordEntrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  service: { type: String, required: true, trim: true },
  username: { type: String, trim: true },
  encryptedPassword: { type: String, required: true },
  url: { type: String },
  category: { type: String, default: 'general' },
  tagIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
  notes: { type: String },
}, { timestamps: true });

export default mongoose.models.PasswordEntry || mongoose.model('PasswordEntry', PasswordEntrySchema);
