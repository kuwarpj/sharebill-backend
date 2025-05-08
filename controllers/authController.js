import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js'; // Import User model

// @desc    Register a new user
// @route   POST /auth/signup
// @access  Public
const signupUser = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }

  try {
    const userExistsByEmail = await User.findOne({ email });
    if (userExistsByEmail) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const userExistsByUsername = await User.findOne({ username });
    if (userExistsByUsername) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    // Password will be hashed by the pre-save hook in userModel.js
    const user = await User.create({
      username,
      email,
      password,
      // avatarUrl will be set by default in the model
    });

    if (user) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { // Use user._id from MongoDB
        expiresIn: '1d',
      });

      res.status(201).json({
        token,
        user: user.toJSON(), // Use toJSON to get virtuals and remove password
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Signup error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server error during signup' });
  }
};

// @desc    Authenticate user and get token
// @route   POST /auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password: inputPassword } = req.body;

  if (!email || !inputPassword) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }

  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(inputPassword))) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { // Use user._id
        expiresIn: '1d',
      });

      res.json({
        token,
        user: user.toJSON(), // Use toJSON to get virtuals and remove password
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

export {
  signupUser,
  loginUser,
};
