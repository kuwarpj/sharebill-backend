import dotenv from 'dotenv';
dotenv.config(); // Ensure this is at the very top and called

import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js'; // Import DB connection
import authRoutes from './routes/authRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { protect } from './middleware/authMiddleware.js';

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:9002',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json()); // for parsing application/json

// Routes
app.use('/auth', authRoutes);
app.use('/api/users', protect, userRoutes);
app.use('/api/groups', protect, groupRoutes);
app.use('/api/expenses', protect, expenseRoutes);

app.get('/', (req, res) => {
  res.send('ShareBill API is running...');
});

// Global error handler (optional, but good practice)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
