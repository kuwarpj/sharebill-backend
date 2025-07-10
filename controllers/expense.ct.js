import Expense from "../models/expense.mo.js";
import Group from "../models/groupModel.js";
import {ApiError} from "../utils/apiError.ut.js";
import {ApiResponse} from "../utils/apiResponse.ut.js";
import { asyncHandler } from "../utils/asyncHandler.ut.js";
import {  calculateUserExpenseView } from "../utils/helper.ut.js";

// export const createExpense = asyncHandler(async (req, res) => {
//   const { groupId, description, amount, paidBy, participantIds, customSplits } =
//     req.body;
//   const userId = req.user._id;

//   if (!groupId || !amount || !paidBy || !participantIds || participantIds.length === 0) {
//     throw new ApiError(400, "Required fields missing");
//   }

//   const group = await Group.findById(groupId);
//   if (!group) throw new ApiError(404, "Group not found");

//   for (const uid of participantIds) {
//     if (!group.members.includes(uid)) {
//       throw new ApiError(403, "One or more participants are not in the group");
//     }
//   }

//   if (!group.members.includes(paidBy)) {
//     throw new ApiError(403, "PaidBy user is not in the group");
//   }

//   // Ensure paidBy is included in participants (not split, but present)
//   const uniqueParticipants = [...new Set([...participantIds, paidBy])];

//   let splits = [];

//   if (customSplits && customSplits.length > 0) {
//     const totalCustom = customSplits.reduce((sum, item) => sum + item.amount, 0);
//     if (totalCustom !== amount) {
//       throw new ApiError(400, "Custom split amounts must total to the full amount");
//     }

//     for (const split of customSplits) {
//       if (!participantIds.includes(split.userId)) {
//         throw new ApiError(400, "Custom split user not in participants");
//       }
//       splits.push({
//         userId: split.userId,
//         amount: split.amount,
//       });
//     }
//   } else {
//     // Equal split logic — paidBy not included
//     const splitCount = participantIds.length;
//     const share = parseFloat((amount / splitCount).toFixed(2));
//     splits = participantIds.map((uid) => ({
//       userId: uid,
//       amount: share,
//     }));
//   }

//   const expense = await Expense.create({
//     groupId,
//     description,
//     amount,
//     paidBy,
//     createdBy: userId,
//     participants: uniqueParticipants,
//     splits,
//   });

//   return res
//     .status(201)
//     .json(new ApiResponse(201, expense, "Expense added successfully"));
// });



 const createExpense = asyncHandler(async (req, res) => {
  const {
    groupId,
    description,
    amount,
    paidBy,
    participantIds,
    customSplits,
  } = req.body;

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
    const totalCustom = customSplits.reduce((sum, item) => sum + item.amount, 0);
    if (totalCustom !== amount) {
      throw new ApiError(400, "Custom split amounts must total the expense amount");
    }

    for (const split of customSplits) {
      if (!participantIds.includes(split.userId)) {
        throw new ApiError(400, `User ${split.userId} in custom split is not in participants`);
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

const  getGroupExpensesForUser = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id;

  const group = await Group.findById(groupId);
  if (!group) throw new ApiError(404, 'Group not found');

  if (!group.members.some(member => member.toString() === userId.toString())) {
    throw new ApiError(403, 'You are not a member of this group');
  }

  const expenses = await Expense.find({ groupId })
    .populate('paidBy', 'username email avatarUrl _id')
    // .populate('participants', 'username email avatarUrl _id')
    .sort({ createdAt: -1 });

  const formatted = calculateUserExpenseView(expenses, userId);

  return res
    .status(200)
    .json(new ApiResponse(200, formatted, 'Group expenses fetched'));
});


export {getGroupExpensesForUser, createExpense }