import Group from "../models/groupModel.js";
import User from "../models/userModel.js";
import GroupInvitation from "../models/groupInvitation.md.js";
import { asyncHandler } from "../utils/asyncHandler.ut.js";
import { ApiError } from "../utils/apiError.ut.js";
import { ApiResponse } from "../utils/apiResponse.ut.js";
import sendEmail from "../utils/sendEmail.ut.js";

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private

const createGroup = asyncHandler(async (req, res) => {
  const { groupName, groupDesc, members = [] } = req.body;
  const creatorId = req.user.id;

  console.log("This is", groupName, groupDesc, members, creatorId);

  if (!groupName) {
    throw new ApiError(400, "Group name is required");
  }

  const creator = await User.findById(creatorId);
  if (!creator) throw new ApiError(404, "Creator not found");
  const group = await Group.create({
    name: groupName,
    description: groupDesc || "",
    members: [creatorId],
    createdBy: creatorId,
  });
  const results = [];

  for (const member of members) {
    if (
      member.email &&
      member.email.toLowerCase() !== creator.email.toLowerCase()
    ) {
      const result = await addMemberToGroup({
        email: member.email,
        groupId: group._id,
        invitedBy: creatorId,
      });
      results.push({ email: member.email, ...result });
    }
  }

  const populatedGroup = await Group.findById(group._id)
    .populate("members", "-password")
    .populate("createdBy", "-password");

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { group: populatedGroup.toJSON(), membersProcessed: results },
        "Group created successfully"
      )
    );
});

const addMemberToGroupHandler = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { email } = req.body;

  if (!email) throw new ApiError(400, "Email is required");

  const result = await addMemberToGroup({
    email,
    groupId,
    invitedBy: req.user.id,
  });

  res
    .status(200)
    .json(new ApiResponse(200, result, "Member processed successfully"));
});

//Utility function to add memeber to group and send email invites
const addMemberToGroup = async ({ email, groupId, invitedBy }) => {
  const group = await Group.findById(groupId);
  if (!group) throw new Error("Group not found");

  const invitingUser = await User.findById(invitedBy);
  if (!invitingUser) throw new Error("Inviting user not found");

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    if (!group.members.includes(existingUser._id)) {
      group.members.push(existingUser._id);
      await group.save();
    }

    await sendEmail(
      normalizedEmail,
      `${invitingUser.username} added you to ${group.name}`,
      `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
    <h2 style="color: #333333;">You’ve been added to a group!</h2>
    <p>Hi there,</p>
    <p><strong>${invitingUser.username}</strong> has added you to the group <strong>${group.name}</strong> on <strong>Splitwise App</strong>.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://yourdomain.com/groups/${group._id}" 
         style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
         View Group
      </a>
    </div>

    <p>If you didn’t expect this email, you can safely ignore it.</p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

    <footer style="text-align: center; color: #888888; font-size: 12px;">
      <p>Splitwise App • Helping friends share expenses easily</p>
      <p>Need help? Contact us at <a href="mailto:support@yourdomain.com">support@yourdomain.com</a></p>
    </footer>
  </div>
  `
    );
    return { status: "added", userId: existingUser._id };
  } else {
    const existingInvite = await GroupInvitation.findOne({
      email: normalizedEmail,
      groupId,
      status: "pending",
    });

    if (!existingInvite) {
      await GroupInvitation.create({
        email: normalizedEmail,
        groupId,
        invitedBy,
        status: "pending",
      });

      await sendEmail(
        normalizedEmail,
        `Join ${group.name} on Splitwise`,
        `<p><b>${invitingUser.username}</b> invited you to join <b>${group.name}</b>.</p>
         <p><a href="https://yourdomain.com/signup?email=${normalizedEmail}">Sign up</a> to join.</p>`
      );
    }

    return { status: "invited" };
  }
};

// @desc    Get all groups for the current user
// @route   GET /api/groups
// @access  Private
const getUserGroups = async (req, res) => {
  const userId = req.user.id;

  try {
    const userGroups = await Group.find({ members: userId })
      .populate("members", "username email avatarUrl id")
      .populate("createdBy", "username email avatarUrl id")
      .sort({ createdAt: -1 });

    res.json(userGroups.map((group) => group.toJSON()));
  } catch (error) {
    console.error("Get user groups error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching user groups" });
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
      .populate("members", "username email avatarUrl id")
      .populate("createdBy", "username email avatarUrl id");

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isMember = group.members.some((member) => member._id.equals(userId));
    if (!isMember) {
      return res
        .status(403)
        .json({ message: "User not authorized to access this group" });
    }

    res.json(group.toJSON());
  } catch (error) {
    console.error("Get group by ID error:", error);
    if (error.kind === "ObjectId") {
      return res
        .status(404)
        .json({ message: "Group not found (invalid ID format)" });
    }
    res
      .status(500)
      .json({ message: "Server error while fetching group details" });
  }
};

// TODO: Add functions for adding/removing members (which would also use invitation logic),
// updating group details, deleting group

export { createGroup, getUserGroups, getGroupById, addMemberToGroupHandler };
