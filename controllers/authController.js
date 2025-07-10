import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Group from "../models/groupModel.js"; // Added for processing invitations
import GroupInvitation from "../models/groupInvitation.md.js"; // Added for processing invitations
import { asyncHandler } from "../utils/asyncHandler.ut.js";
import { ApiError } from "../utils/apiError.ut.js";
import { generateOTP } from "../utils/helper.ut.js";
import sendEmail from "../utils/sendEmail.ut.js";
import { ApiResponse } from "../utils/apiResponse.ut.js";
import User from "../models/userModel.js";
import OtpVerification from "../models/verifyOtp.mo.js";

// @desc    Register a new user
// @route   POST /auth/signup
// @access  Public

const signupUser = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "Please enter all fields" });
  }

  try {
    const lowercasedEmail = email.toLowerCase();
    const userExistsByEmail = await User.findOne({ email: lowercasedEmail });
    if (userExistsByEmail) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    const userExistsByUsername = await User.findOne({ username });
    if (userExistsByUsername) {
      return res.status(400).json({ message: "Username is already taken" });
    }

    const user = await User.create({
      username,
      email: lowercasedEmail,
      password,
    });

    if (user) {
      // Process pending group invitations
      const pendingInvitations = await GroupInvitation.find({
        email: user.email,
        status: "pending",
      });
      for (const invitation of pendingInvitations) {
        const group = await Group.findById(invitation.groupId);
        if (group) {
          if (!group.members.includes(user._id)) {
            group.members.push(user._id);
            await group.save();
          }
          invitation.status = "accepted";
          await invitation.save();
          console.log(
            `User ${user.email} automatically added to group ${group.name} from invitation.`
          );
        } else {
          // Group might have been deleted, mark invitation as declined or remove
          invitation.status = "declined"; // Or simply remove: await invitation.remove();
          await invitation.save();
          console.warn(
            `Group ${invitation.groupId} not found for accepted invitation for ${user.email}`
          );
        }
      }
      // TODO: Send actual welcome email and notification about group additions here.

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });

      res.status(201).json({
        token,
        user: user.toJSON(),
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.error("Signup error:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    res.status(500).json({ message: "Server error during signup" });
  }
};

const sendOtpToEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  console.log("This is Req", req.body);

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, "User already exists with this email");
  }

  const otp = generateOTP();
  const optExpires = new Date(Date.now() + 10 * 60 * 1000);

  await OtpVerification.findOneAndUpdate(
    { email },
    { otp, optExpires },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await sendEmail(
    email,
    "Your OTP Code",
    `<p>Your OTP is <b>${otp}</b>. It is valid for 10 minutes.</p>`
  );

  return res
    .status(200)
    .json(new ApiResponse(200, null, "OTP sent successfully"));
});



const verifyOtpAndSignup = asyncHandler(async (req, res) => {
  const { email, otp, username, password } = req.body;

  if (!email || !otp || !username || !password) {
    throw new ApiError(400, "All fields are required");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, "User already exists with this email");
  }

  const otpRecord = await OtpVerification.findOne({ email });
  if (!otpRecord || otpRecord.otp !== otp || otpRecord.otpExpires < Date.now()) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  // Create new user
  const newUser = await User.create({ username, email, password });

  // Delete OTP record
  await OtpVerification.deleteOne({ email });

  const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  return res.status(201).json(
    new ApiResponse(201, { token, user: newUser.toJSON() }, "User created successfully")
  );
});


const loginUser = async (req, res) => {
  const { email, password: inputPassword } = req.body;

  if (!email || !inputPassword) {
    return res.status(400).json({ message: "Please enter all fields" });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (user && (await user.matchPassword(inputPassword))) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });

      res.json({
        token,
        user: user.toJSON(),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

export { signupUser, loginUser, sendOtpToEmail, verifyOtpAndSignup };
