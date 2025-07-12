import personalExpense from "../models/personalExpense.mo.js";
import { ApiResponse, asyncHandler } from "../utils/api.ut.js";

const addPersonalExpesne = asyncHandler(async (req, res) => {
  const { description, amount } = req.body;

  const userId = req.user._id;

  const expense = personalExpense.create({
    description,
    amount,
    paidBy: userId,
  });

  return res
    .status(201)
    .json(new ApiResponse(200, expense, "Personal expense added successfully"));
});

const getPersonalExpense = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const expense = personalExpense
    .findBy({ paidBy: userId })
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, expense, "Fetched personal expenses"));
});

const editPersonalExpense = asyncHandler(async (req, res) => {
  const { expenseId } = req.params;
  const { description, amount } = req.body;
  const userId = req.user._id;
  if (!description || !amount || amount <= 0) {
    throw new ApiError(400, "Description and valid amount are required");
  }

  const expense = personalExpense.findById(expenseId);
  if (!expense) {
    throw new ApiError(404, "Personal expense not found");
  }

  if (expense.paidBy.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to edit this expense");
  }
  expense.description = description;
  expense.amount = amount;

  try {
    await expense.save();
  } catch (err) {
    console.error("Failed to save expense:", err.message);
    throw new ApiError(500, "Failed to save updated personal expense");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, expense, "Personal expense updated successfully")
    );
});

export { addPersonalExpesne, getPersonalExpense, editPersonalExpense };
