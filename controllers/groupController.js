import Group from '../models/groupModel.js';
import User from '../models/userModel.js';

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
const createGroup = async (req, res) => {
  const { groupName, groupDescription, members: memberInputs } = req.body; // memberInputs: array of { email: string }
  const creatorId = req.user.id; // User creating the group

  if (!groupName) {
    return res.status(400).json({ message: 'Group name is required' });
  }

  try {
    const creator = await User.findById(creatorId);
    if (!creator) {
      return res.status(404).json({ message: 'Creator profile not found.' });
    }

    const memberIds = [creatorId]; // Creator is always a member

    if (memberInputs && Array.isArray(memberInputs)) {
      for (const input of memberInputs) {
        if (input.email && input.email !== creator.email) { // Don't add creator twice if email matches
          const memberUser = await User.findOne({ email: input.email });
          if (memberUser && !memberIds.includes(memberUser._id.toString())) {
            memberIds.push(memberUser._id);
          } else if (!memberUser) {
            console.warn(`User with email ${input.email} not found, not adding to group.`);
            // Optionally, you could create placeholder/invited users or send invites here
          }
        }
      }
    }
    
    const newGroup = new Group({
      name: groupName,
      description: groupDescription || '',
      members: memberIds,
      createdBy: creatorId,
      // iconUrl will be set by default in model
    });

    const savedGroup = await newGroup.save();
    const populatedGroup = await Group.findById(savedGroup._id).populate('members', '-password').populate('createdBy', '-password');
    
    res.status(201).json(populatedGroup.toJSON());

  } catch (error) {
    console.error('Create group error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server error during group creation' });
  }
};

// @desc    Get all groups for the current user
// @route   GET /api/groups
// @access  Private
const getUserGroups = async (req, res) => {
  const userId = req.user.id;
  
  try {
    const userGroups = await Group.find({ members: userId })
      .populate('members', 'username email avatarUrl id') // Populate specific fields, id for frontend
      .populate('createdBy', 'username email avatarUrl id')
      .sort({ createdAt: -1 }); // Sort by newest first

    // Note: currentUserBalance is not stored in the DB model.
    // It should be calculated on the client or via a separate endpoint/aggregation if complex.
    // The frontend currently does a simplified calculation.
    res.json(userGroups.map(group => group.toJSON()));

  } catch (error) {
    console.error('Get user groups error:', error);
    res.status(500).json({ message: 'Server error while fetching user groups' });
  }
};

// @desc    Get a single group by ID
// @route   GET /api/groups/:id
// @access  Private (user must be a member)
const getGroupById = async (req, res) => {
  const groupId = req.params.id;
  const userId = req.user.id;

  try {
    const group = await Group.findById(groupId)
      .populate('members', 'username email avatarUrl id')
      .populate('createdBy', 'username email avatarUrl id');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Authorization: Check if current user is a member of the group
    const isMember = group.members.some(member => member._id.equals(userId));
    if (!isMember) {
      return res.status(403).json({ message: 'User not authorized to access this group' });
    }
  
    // As before, currentUserBalance is not directly stored. Client calculates it.
    res.json(group.toJSON());

  } catch (error) {
    console.error('Get group by ID error:', error);
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Group not found (invalid ID format)' });
    }
    res.status(500).json({ message: 'Server error while fetching group details' });
  }
};

// TODO: Add functions for adding/removing members, updating group details, deleting group

export {
  createGroup,
  getUserGroups,
  getGroupById,
};
