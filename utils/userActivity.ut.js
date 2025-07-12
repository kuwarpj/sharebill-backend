// utils/activityHelpers.js

import Group from "../models/groupModel.js";
import Activity from "../models/userActivity.mo.js";
import User from "../models/userModel.js";

export async function createExpenseActivity(expense, creatorId) {
  const group = await Group.findById(expense.groupId);
  
  // Activity for expense creator
  await Activity.create({
    userId: creatorId,
    groupId: expense.groupId,
    groupName: group.name,
    type: "EXPENSE_CREATED",
    description: `You added expense "${expense.description}"`,
    amount: expense.amount,
    amountType: "paid", // Since they paid initially
    expenseId: expense._id,
    involvedUsers: expense.splits.map(split => ({
      userId: split.userId,
      amount: split.amount,
      amountType: "owed",
    })),
  });

  // Activities for participants
  for (const split of expense.splits) {
    if (split.userId.toString() !== expense.paidBy.toString()) {
      const participant = await User.findById(split.userId);
      
      await Activity.create({
        userId: split.userId,
        groupId: expense.groupId,
        groupName: group.name,
        type: "EXPENSE_INVOLVED",
        description: `You owe for "${expense.description}"`,
        amount: split.amount,
        amountType: "owed",
        expenseId: expense._id,
        involvedUsers: [{
          userId: expense.paidBy,
          amount: split.amount,
          amountType: "lent",
        }],
      });

      // Also create a "lent" activity for the payer
      await Activity.create({
        userId: expense.paidBy,
        groupId: expense.groupId,
        groupName: group.name,
        type: "EXPENSE_INVOLVED",
        description: `${participant.username} owes you for "${expense.description}"`,
        amount: split.amount,
        amountType: "lent",
        expenseId: expense._id,
        involvedUsers: [{
          userId: split.userId,
          amount: split.amount,
          amountType: "owed",
        }],
      });
    }
  }
}

export async function createGroupInviteActivity(groupId, invitedBy, email) {
  const group = await Group.findById(groupId);
  const inviter = await User.findById(invitedBy);
  
  await Activity.create({
    userId: invitedBy,
    groupId,
    groupName: group.name,
    type: "INVITATION_SENT",
    description: `You invited ${email} to ${group.name}`,
    amountType: "none",
  });
}

export async function createGroupJoinActivity(groupId, userId, invitedBy) {
  const group = await Group.findById(groupId);
  const inviter = await User.findById(invitedBy);
  
  // Activity for joiner
  await Activity.create({
    userId,
    groupId,
    groupName: group.name,
    type: "GROUP_JOINED",
    description: `You joined ${group.name}`,
    amountType: "none",
    involvedUsers: [{
      userId: invitedBy,
      amountType: "none",
    }],
  });

  // Activity for inviter
  await Activity.create({
    userId: invitedBy,
    groupId,
    groupName: group.name,
    type: "INVITATION_ACCEPTED",
    description: `Your invite to ${group.name} was accepted`,
    amountType: "none",
    involvedUsers: [{
      userId,
      amountType: "none",
    }],
  });
}