import mongoose from "mongoose";

const personalExpenseSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const personalExpense = mongoose.model(
  "personalExpense",
  personalExpenseSchema
);

export default personalExpense;
