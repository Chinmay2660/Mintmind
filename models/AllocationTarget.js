import mongoose from 'mongoose';

const AllocationTargetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  equity: { type: Number, default: 60, min: 0, max: 100 },
  debt: { type: Number, default: 25, min: 0, max: 100 },
  gold: { type: Number, default: 10, min: 0, max: 100 },
  cash: { type: Number, default: 5, min: 0, max: 100 },
  other: { type: Number, default: 0, min: 0, max: 100 },
}, { timestamps: true });

export default mongoose.models.AllocationTarget || mongoose.model('AllocationTarget', AllocationTargetSchema);
