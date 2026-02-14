import mongoose from 'mongoose';

const CashSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    default: 0,
    required: true,
  },
  currency: {
    type: String,
    default: 'INR',
  },
}, {
  timestamps: true,
});

export default mongoose.models.Cash || mongoose.model('Cash', CashSchema);

