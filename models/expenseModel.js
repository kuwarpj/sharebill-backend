import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
  },
  description: {
    type: String,
    required: [true, 'Expense description is required'],
    trim: true,
  },
  amount: {
    type: Number,
    required: [true, 'Expense amount is required'],
    min: [0.01, 'Amount must be greater than 0'],
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  splitType: {
    type: String,
    enum: ['equal', 'custom'], // Add more types as needed
    default: 'equal',
  },
  participants: [{ // Users involved in this expense, for whom the split applies
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  category: {
    type: String,
    default: 'General',
    trim: true,
  },
  addedBy: { // User who added the expense entry, could be different from paidBy
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure virtuals are included when converting to JSON and to remove _id and __v
expenseSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Expense = mongoose.model('Expense', expenseSchema);

export default Expense;
