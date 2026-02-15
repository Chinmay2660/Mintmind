import mongoose from 'mongoose';

const FamilyGoalSchema = new mongoose.Schema({
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
  },
  targetAmount: {
    type: Number,
    required: true,
  },
  currentAmount: {
    type: Number,
    default: 0,
  },
  targetDate: {
    type: Date,
  },
  category: {
    type: String,
    enum: ['savings', 'investment', 'expense', 'other'],
    default: 'savings',
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

FamilyGoalSchema.index({ familyId: 1, status: 1 });

export default mongoose.models.FamilyGoal || mongoose.model('FamilyGoal', FamilyGoalSchema);

