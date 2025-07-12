import express from "express";
import cors from "cors";

import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import expenseRoutes from "./routes/expense.rt.js";
import userRoutes from "./routes/userRoutes.js";
import personalExpenseRoute from "./routes/personalExpense.rt.js";
import { protect } from "./middleware/authMiddleware.js";
import notificationRoutes from "./routes/notification.rt.js";
const app = express();

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
};
app.use(cors(corsOptions));
console.log("CORS origin:", corsOptions.origin);
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser())

// Routes for auth
app.use("/auth", authRoutes);
app.use("/api/users", protect, userRoutes);

app.use("/api/groups", protect, groupRoutes);
app.use("/api/invite", protect, notificationRoutes);

//Expense
app.use("/api/expenses", protect, expenseRoutes);

//Personal Expense
app.use("/api/personal", protect, personalExpenseRoute);




// Global error handler (optional, but good practice)
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  const response = {
    success: err.success,
    message: err.message || "Internal Server Error",
    ...(err.data && { data: err.data }),
    ...(Array.isArray(err.errors) &&
      err.errors.length > 0 && { errors: err.errors }),
  };

  res.status(statusCode).json(response);
});

export default app;
