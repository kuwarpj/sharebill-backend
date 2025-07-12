import mongoose from "mongoose";

// models/activity.model.js
const activitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
    },
    groupName: {
      // Denormalized for easier querying
      type: String,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "GROUP_CREATED",
        "GROUP_JOINED",
        "INVITATION_SENT",
        "INVITATION_ACCEPTED",
        "EXPENSE_CREATED",
        "EXPENSE_INVOLVED",
        "PAYMENT_RECEIVED",
        "PAYMENT_SENT",
      ],
    },
    description: {
      type: String,
      required: true,
    },
    amount: {
      // For financial activities
      type: Number,
    },
    amountType: {
      // "owed", "paid", "lent", etc.
      type: String,
      enum: ["owed", "paid", "lent", "received", "none"],
      default: "none",
    },
    expenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense",
    },
    involvedUsers: [
      {
        // Other users involved in this activity
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        username: String, // Denormalized for easier display
        amount: Number,
        amountType: String,
      },
    ],
  },
  { timestamps: true }
);

const Activity = mongoose.model("Activity", activitySchema);

export default Activity
