import mongoose from 'mongoose';

const PairCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }, // Auto-delete after expiration
  },
  used: {
    type: Boolean,
    default: false,
  },
  usedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  usedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Index for faster lookups
PairCodeSchema.index({ code: 1, used: 1, expiresAt: 1 });

export default mongoose.models.PairCode || mongoose.model('PairCode', PairCodeSchema);

