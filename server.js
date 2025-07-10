import dotenv from "dotenv";
dotenv.config(); // Ensure this is at the very top and called

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js"; // Import DB connection
import authRoutes from "./routes/authRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import expenseRoutes from "./routes/expense.rt.js";
import userRoutes from "./routes/userRoutes.js";
import { protect } from "./middleware/authMiddleware.js";
import notificationRoutes from './routes/notification.rt.js'

// Connect to MongoDB
connectDB();

const app = express();


// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:9002",
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(express.json());
// app.use(cookieParser());






// Routes for auth
app.use("/auth", authRoutes);
app.use("/api/users", protect, userRoutes);



app.use("/api/groups", protect, groupRoutes);
app.use("/api/notification", protect, notificationRoutes);



//Expense
app.use("/api/expenses", protect, expenseRoutes);



app.get("/", (req, res) => {
  res.send("ShareBill API is running...");
});








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




const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
