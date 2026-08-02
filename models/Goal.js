import mongoose from 'mongoose';

const GoalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  familyGoalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyGoal',
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
}, {
  timestamps: true,
});

GoalSchema.index({ userId: 1, status: 1 });
GoalSchema.index({ familyGoalId: 1, userId: 1 }, { unique: true, sparse: true });

export default mongoose.models.Goal || mongoose.model('Goal', GoalSchema);
