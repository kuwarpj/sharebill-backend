import Expense from "../models/expense.mo.js";
import Group from "../models/groupModel.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/api.ut.js";

import { calculateUserExpenseView } from "../utils/helper.ut.js";

const createExpense = asyncHandler(async (req, res) => {
  const { groupId, description, amount, paidBy, participantIds, customSplits } =
    req.body;

  const userId = req.user._id;

  if (
    !groupId ||
    !description ||
    !amount ||
    !paidBy ||
    !participantIds ||
    participantIds.length === 0
  ) {
    throw new ApiError(400, "Required fields missing");
  }

  const group = await Group.findById(groupId);
  if (!group) throw new ApiError(404, "Group not found");

  // Validate payer is in group
  if (!group.members.includes(paidBy)) {
    throw new ApiError(403, "Payer is not a member of this group");
  }

  // Validate all participants are in group
  for (const uid of participantIds) {
    if (!group.members.includes(uid)) {
      throw new ApiError(403, `Participant ${uid} is not in the group`);
    }
  }

  let splits = [];

  // If custom split provided
  if (customSplits && customSplits.length > 0) {
    const totalCustom = customSplits.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    if (totalCustom !== amount) {
      throw new ApiError(
        400,
        "Custom split amounts must total the expense amount"
      );
    }

    for (const split of customSplits) {
      if (!participantIds.includes(split.userId)) {
        throw new ApiError(
          400,
          `User ${split.userId} in custom split is not in participants`
        );
      }
      splits.push({
        userId: split.userId,
        amount: split.amount,
      });
    }
  } else {
    // Equal split
    const splitCount = participantIds.length;
    const share = parseFloat((amount / splitCount).toFixed(2));
    const total = share * splitCount;
    const adjustment = parseFloat((amount - total).toFixed(2)); // To fix float issues

    splits = participantIds.map((uid, index) => ({
      userId: uid,
      amount: index === 0 ? share + adjustment : share,
    }));
  }

  // Only include participants explicitly — don't auto-add payer unless listed
  const finalParticipants = [...new Set(participantIds)];

  const expense = await Expense.create({
    groupId,
    description,
    amount,
    paidBy,
    createdBy: userId,
    participants: finalParticipants,
    splits,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, expense, "Expense added successfully"));
});

const updateExpense = asyncHandler(async (req, res) => {
  const { expenseId } = req.params;
  const {
    description,
    amount,
    paidBy,
    participantIds,
    customSplits = [],
  } = req.body;

  const userId = req.user._id;

  // Fetch expense and group
  const expense = await Expense.findById(expenseId);
  if (!expense) throw new ApiError(404, "Expense not found");

  const group = await Group.findById(expense.groupId);
  if (!group) throw new ApiError(404, "Group not found");

  // Authorization check
  const isCreatorOrPayer =
    expense.createdBy.toString() === userId.toString() ||
    expense.paidBy.toString() === userId.toString();
  if (!isCreatorOrPayer) {
    throw new ApiError(403, "You are not authorized to edit this expense");
  }

  // Validate input
  if (
    !description?.trim() ||
    !amount ||
    !paidBy ||
    !Array.isArray(participantIds) ||
    participantIds.length === 0
  ) {
    throw new ApiError(400, "Missing or invalid fields");
  }

  const memberIds = group.members.map((id) => id.toString());
  if (!memberIds.includes(paidBy)) {
    throw new ApiError(403, "PaidBy user is not a member of the group");
  }

  for (const uid of participantIds) {
    if (!memberIds.includes(uid)) {
      throw new ApiError(403, `Participant ${uid} is not in the group`);
    }
  }

  // Generate splits
  let splits = [];
  const rounded = (val) => parseFloat(val.toFixed(2));

  if (customSplits.length > 0) {
    const totalCustom = customSplits.reduce((sum, s) => sum + s.amount, 0);
    if (rounded(totalCustom) !== rounded(amount)) {
      throw new ApiError(400, "Custom split total must match amount");
    }

    for (const split of customSplits) {
      if (!participantIds.includes(split.userId)) {
        throw new ApiError(
          400,
          `Custom split user ${split.userId} is not in participants`
        );
      }
      splits.push({
        userId: split.userId,
        amount: rounded(split.amount),
      });
    }
  } else {
    const count = participantIds.length;
    const share = rounded(amount / count);
    const total = rounded(share * count);
    const adjustment = rounded(amount - total);

    splits = participantIds.map((uid, index) => ({
      userId: uid,
      amount: index === 0 ? share + adjustment : share,
    }));
  }

  // Update and save expense
  Object.assign(expense, {
    description: description.trim(),
    amount: rounded(amount),
    paidBy,
    participants: [...new Set(participantIds)],
    splits,
  });

  await expense.save();

  res
    .status(200)
    .json(new ApiResponse(200, expense, "Expense updated successfully"));
});

const getGroupExpensesForUser = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id;

  const group = await Group.findById(groupId);
  if (!group) throw new ApiError(404, "Group not found");

  if (
    !group.members.some((member) => member.toString() === userId.toString())
  ) {
    throw new ApiError(403, "You are not a member of this group");
  }

  const expenses = await Expense.find({ groupId })
    .populate("paidBy", "username email avatarUrl _id")
    .populate("participants", "username email avatarUrl _id")
    .sort({ createdAt: -1 });

  const formatted = calculateUserExpenseView(expenses, userId);

  return res
    .status(200)
    .json(new ApiResponse(200, formatted, "Group expenses fetched"));
});

export { getGroupExpensesForUser, createExpense, updateExpense };
