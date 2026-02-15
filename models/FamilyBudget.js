import mongoose from 'mongoose';

const FamilyBudgetSchema = new mongoose.Schema({
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
    index: true,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  },
  categoryName: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  period: {
    type: String,
    enum: ['monthly', 'quarterly', 'half-yearly', 'yearly'],
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  description: {
    type: String,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

FamilyBudgetSchema.index({ familyId: 1, period: 1, startDate: 1 });

export default mongoose.models.FamilyBudget || mongoose.model('FamilyBudget', FamilyBudgetSchema);

