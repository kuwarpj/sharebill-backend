import Group from '../models/groupModel.js';
import User from '../models/userModel.js';
import { ApiResponse, asyncHandler } from '../utils/api.ut.js';
import Expense from "../models/expense.mo.js";

// @desc    Get current user's profile
// @route   GET /api/users/me
// @access  Private
const getMe = async (req, res) => {
  // req.user.id is set by the 'protect' middleware and contains the user's MongoDB _id
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'Not authorized, user ID not found in request' });
  }

  try {
    const user = await User.findById(req.user.id).select('-password'); // Exclude password

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.toJSON()); // Use toJSON for virtuals and consistent output
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ message: 'Server error while fetching user profile' });
  }
};

// Example: Search users (e.g., for adding to groups by email or username)
// @desc    Search for users by email or username
// @route   GET /api/users/search?q=searchTerm
// @access  Private (or as needed)
const searchUsers = async (req, res) => {
    const searchTerm = req.query.q;
    if (!searchTerm) {
        return res.status(400).json({ message: "Search term is required" });
    }

    try {
        const users = await User.find({
            $or: [
                { email: { $regex: searchTerm, $options: 'i' } }, // Case-insensitive search
                { username: { $regex: searchTerm, $options: 'i' } }
            ]
        }).select('-password').limit(10); // Limit results for performance

        res.json(users.map(user => user.toJSON()));
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ message: "Server error during user search" });
    }
};


export {
  getMe,
  searchUsers, // Add other user controller functions as needed
};


const getUserFinancialSummary = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const userGroups = await Group.find({ members: userId })
    .select('name description createdAt')
    .populate('createdBy', 'username');

  const groupSummaries = await Promise.all(userGroups.map(async (group) => {
    const expenses = await Expense.find({ 
      groupId: group._id,
      $or: [
        { paidBy: userId },
        { 'splits.userId': userId }
      ]
    }).populate('paidBy', 'username');

    // Initialize totals
    let totalOwed = 0;   
    let totalLent = 0;
    const individualBalances = {}; 

    expenses.forEach(expense => {
      // User paid this expense
      if (expense.paidBy._id.toString() === userId.toString()) {
        // Calculate how much others owe
        expense.splits.forEach(split => {
          if (split.userId.toString() !== userId.toString()) {
            totalLent += split.amount;
            individualBalances[split.userId] = 
              (individualBalances[split.userId] || 0) + split.amount;
          }
        });
      }
      // User is participant
      else {
        const userSplit = expense.splits.find(s => s.userId.toString() === userId.toString());
        if (userSplit) {
          totalOwed += userSplit.amount;
          individualBalances[expense.paidBy._id] = 
            (individualBalances[expense.paidBy._id] || 0) - userSplit.amount;
        }
      }
    });

    // Format individual balances
    const balances = await Promise.all(
      Object.entries(individualBalances).map(async ([otherUserId, amount]) => {
        const user = await User.findById(otherUserId).select('username');
        return {
          userId: otherUserId,
          username: user.username,
          amount: Math.abs(amount).toFixed(2),
          status: amount > 0 ? 'owes_you' : 'you_owe',
          amountNumber: amount 
        };
      })
    );

    return {
      groupId: group._id,
      groupName: group.name,
      groupDescription: group.description,
      createdBy: {
        userId: group.createdBy._id,
        username: group.createdBy.username
      },
      createdAt: group.createdAt,
      financialSummary: {
        totalOwed: totalOwed.toFixed(2),
        totalLent: totalLent.toFixed(2),
        netBalance: (totalLent - totalOwed).toFixed(2),
        status: totalLent > totalOwed ? 'net_lender' : 
               totalOwed > totalLent ? 'net_borrower' : 'fully_settled'
      },
      individualBalances: balances.filter(b => b.amountNumber !== 0) 
        .map(b => {
          const { amountNumber, ...rest } = b;
          return rest;
        })
    };
  }));

  // Calculate overall totals
  const totalOwed = groupSummaries.reduce((sum, g) => sum + parseFloat(g.financialSummary.totalOwed), 0);
  const totalLent = groupSummaries.reduce((sum, g) => sum + parseFloat(g.financialSummary.totalLent), 0);
  const netBalance = totalLent - totalOwed;

  const overallSummary = {
    totalGroups: userGroups.length,
    totalOwed: totalOwed.toFixed(2),
    totalLent: totalLent.toFixed(2),
    netBalance: netBalance.toFixed(2),
    status: groupSummaries.some(g => g.financialSummary.status !== 'fully_settled') 
      ? (netBalance > 0 ? 'net_lender' : 'net_borrower')
      : 'fully_settled'
  };

  return res.status(200).json(
    new ApiResponse(200, {
      userInfo: {
        userId: req.user._id,
        username: req.user.username,
        email: req.user.email
      },
      groupSummaries,
      overallSummary
    }, "User financial summary fetched successfully")
  );
});

export {getUserFinancialSummary}