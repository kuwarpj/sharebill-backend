import User from '../models/userModel.js';

// @desc    Get current user's profile
// @route   GET /api/users/me
// @access  Private
const getMe = async (req, res) => {
  // req.user.id is set by the 'protect' middleware and contains the user's MongoDB _id
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'Not authorized, user ID not found in request' });
  }

  try {
    const user = await User.findById(req.user.id).select('-password'); // Exclude password

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.toJSON()); // Use toJSON for virtuals and consistent output
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ message: 'Server error while fetching user profile' });
  }
};

// Example: Search users (e.g., for adding to groups by email or username)
// @desc    Search for users by email or username
// @route   GET /api/users/search?q=searchTerm
// @access  Private (or as needed)
const searchUsers = async (req, res) => {
    const searchTerm = req.query.q;
    if (!searchTerm) {
        return res.status(400).json({ message: "Search term is required" });
    }

    try {
        const users = await User.find({
            $or: [
                { email: { $regex: searchTerm, $options: 'i' } }, // Case-insensitive search
                { username: { $regex: searchTerm, $options: 'i' } }
            ]
        }).select('-password').limit(10); // Limit results for performance

        res.json(users.map(user => user.toJSON()));
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ message: "Server error during user search" });
    }
};


export {
  getMe,
  searchUsers, // Add other user controller functions as needed
};
