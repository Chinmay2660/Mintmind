import mongoose from 'mongoose';

const FamilySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  familyHead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['head', 'member'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'removed'],
      default: 'active',
    },
  }],
  settings: {
    shareInvestments: {
      type: Boolean,
      default: true,
    },
    shareExpenses: {
      type: Boolean,
      default: true,
    },
    shareBudgets: {
      type: Boolean,
      default: true,
    },
    shareSalary: {
      type: Boolean,
      default: true,
    },
  },
}, {
  timestamps: true,
});

// Index for faster queries
FamilySchema.index({ 'members.user': 1 });
FamilySchema.index({ familyHead: 1 });

export default mongoose.models.Family || mongoose.model('Family', FamilySchema);

