import Group from "../models/groupModel.js";
import User from "../models/userModel.js";
import GroupInvitation from "../models/groupInvitation.mo.js";

import sendEmail from "../utils/sendEmail.ut.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/api.ut.js";

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

  // Prevent duplicate invites
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

    const actionText = existingUser
      ? `Log in to accept the invitation`
      : `Sign up to join the group`;

    const actionLink = existingUser
      ? `https://yourdomain.com/invites` // or a direct accept link
      : `https://yourdomain.com/signup?email=${normalizedEmail}`;

    await sendEmail(
      normalizedEmail,
      `Join ${group.name} on Splitwise`,
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>You're Invited to Join ${group.name}</h2>
        <p><strong>${invitingUser.username}</strong> has invited you to join <strong>${group.name}</strong>.</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${actionLink}" style="padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
            ${actionText}
          </a>
        </div>
        <p>If you didn’t expect this, you can safely ignore the email.</p>
      </div>
      `
    );
  }

  return { status: "invited" };
};

// @desc    Get all groups for the current user
// @route   GET /api/groups
// @access  Private

const getUserGroups = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const groups = await Group.find({ members: userId })
    .populate("members", "username email avatarUrl id")
    .populate("createdBy", "username email avatarUrl")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, groups, "Groups fetched successfully"));
});
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
