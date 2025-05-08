import Expense from '../models/expenseModel.js';
import Group from '../models/groupModel.js';
import User from '../models/userModel.js';

// @desc    Add a new expense to a group
// @route   POST /api/expenses
// @access  Private
const addExpense = async (req, res) => {
  const { groupId, description, amount, paidById, category } = req.body;
  const userId = req.user.id; // User adding the expense (from token)

  if (!groupId || !description || !amount || !paidById) {
    return res.status(400).json({ message: 'Missing required expense fields' });
  }
  if (parseFloat(amount) <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number.' });
  }

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Authorization: Check if current user (adder) is part of the group
    if (!group.members.some(memberId => memberId.equals(userId))) {
        return res.status(403).json({ message: 'User not authorized to add expenses to this group' });
    }
    
    const paidByUser = await User.findById(paidById);
    if (!paidByUser) {
      return res.status(404).json({ message: 'Payer user not found' });
    }
    // Check if payer is part of the group
    if (!group.members.some(memberId => memberId.equals(paidById))) {
        return res.status(400).json({ message: 'Payer must be a member of the group' });
    }

    // For 'equal' split, participants are all group members.
    // A more complex app would get participants from request for custom splits.
    const participantIds = group.members; 

    const newExpense = new Expense({
      groupId,
      description,
      amount: parseFloat(amount),
      paidBy: paidById, 
      splitType: 'equal', // Default or from request for more complex splits
      participants: participantIds, 
      category: category || 'General',
      addedBy: userId,
    });

    const savedExpense = await newExpense.save();
    // Populate paidBy for the response
    const populatedExpense = await Expense.findById(savedExpense._id)
                                          .populate('paidBy', 'username email avatarUrl id')
                                          .populate('participants', 'username email avatarUrl id') // Optional: populate participants if needed by client
                                          .populate('addedBy', 'username email avatarUrl id'); 

    res.status(201).json(populatedExpense.toJSON());

  } catch (error) {
    console.error('Add expense error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server error during expense creation' });
  }
};

// @desc    Get all expenses for a specific group
// @route   GET /api/expenses/group/:groupId
// @access  Private
const getGroupExpenses = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Authorization: Check if current user is part of this group
    if (!group.members.some(memberId => memberId.equals(userId))) {
        return res.status(403).json({ message: 'User not authorized to view expenses for this group' });
    }

    const groupExpenses = await Expense.find({ groupId: groupId })
      .populate('paidBy', 'username email avatarUrl id') // Populate only needed fields
      .populate('addedBy', 'username email avatarUrl id') // Populate addedBy if needed
      // .populate('participants', 'username email avatarUrl id') // Populate if needed by client
      .sort({ createdAt: -1 }); // Sort by newest first
    
    res.json(groupExpenses.map(exp => exp.toJSON()));

  } catch (error) {
    console.error('Get group expenses error:', error);
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Group not found (invalid ID format)' });
    }
    res.status(500).json({ message: 'Server error while fetching group expenses' });
  }
};

// TODO: Add functions for updating an expense, deleting an expense, getting single expense details

export {
  addExpense,
  getGroupExpenses,
};
