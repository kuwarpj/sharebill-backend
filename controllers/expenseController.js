import Expense from '../models/expenseModel.js';
import Group from '../models/groupModel.js';
import User from '../models/userModel.js';

// @desc    Add a new expense to a group
// @route   POST /api/expenses
// @access  Private
const addExpense = async (req, res) => {
  const { groupId, description, amount, paidById, category, participantIds: customParticipantIds } = req.body;
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

    let finalParticipantIds = [];
    if (customParticipantIds && Array.isArray(customParticipantIds) && customParticipantIds.length > 0) {
      // Validate that all custom participants are members of the group
      for (const pId of customParticipantIds) {
        if (!group.members.some(memberId => memberId.equals(pId))) {
          return res.status(400).json({ message: `Participant with ID ${pId} is not a member of this group.` });
        }
        // Ensure no duplicate participant IDs if custom list is provided
        // Corrected: Use string comparison as finalParticipantIds contains strings.
        if (!finalParticipantIds.includes(pId)) {
            finalParticipantIds.push(pId);
        }
      }
      if (finalParticipantIds.length === 0) { 
        return res.status(400).json({ message: 'At least one participant must be selected for the expense.' });
      }
    } else {
      // Default to all group members if no specific participants are provided
      finalParticipantIds = group.members.map(memberId => memberId.toString());
    }

    if (finalParticipantIds.length === 0) {
        return res.status(400).json({ message: 'Cannot add an expense with no participants.' });
    }


    const newExpense = new Expense({
      groupId,
      description,
      amount: parseFloat(amount),
      paidBy: paidById, 
      splitType: 'equal', // For now, always equal among the (selected) participants
      participants: finalParticipantIds, 
      category: category || 'General',
      addedBy: userId,
    });

    const savedExpense = await newExpense.save();
    // Populate fields for the response
    const populatedExpense = await Expense.findById(savedExpense._id)
                                          .populate('paidBy', 'username email avatarUrl id')
                                          .populate('participants', 'username email avatarUrl id') 
                                          .populate('addedBy', 'username email avatarUrl id'); 

    res.status(201).json(populatedExpense.toJSON());

  

  } catch (error) {
    console.error('Add expense error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    // Catching TypeErrors as well as other generic server errors
    if (error instanceof TypeError) {
        console.error('TypeError in addExpense:', error.message, error.stack);
        return res.status(500).json({ message: 'Server error due to a type issue. Please check inputs or contact support.' });
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
      .populate('paidBy', 'username email avatarUrl id') 
      .populate('addedBy', 'username email avatarUrl id') 
      .populate('participants', 'username email avatarUrl id') // Populate participants for client display
      .sort({ createdAt: -1 }); 
    
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