import jwt from "jsonwebtoken";
import Group from "../models/groupModel.js"; // Added for processing invitations
import GroupInvitation from "../models/groupInvitation.mo.js"; // Added for processing invitations
import { generateOTP } from "../utils/helper.ut.js";
import sendEmail from "../utils/sendEmail.ut.js";
import User from "../models/userModel.js";
import OtpVerification from "../models/verifyOtp.mo.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/api.ut.js";


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
  if (
    !otpRecord ||
    otpRecord.otp !== otp ||
    otpRecord.otpExpires < Date.now()
  ) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  // Create new user
  const newUser = await User.create({ username, email, password });

  // Delete OTP record
  await OtpVerification.deleteOne({ email });

  const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // use secure cookies in production
    sameSite: "lax", 
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { token, user: newUser.toJSON() },
        "User created successfully"
      )
    );
});

 const loginUser = asyncHandler(async (req, res) => {
  const { email, password: inputPassword } = req.body;

  if (!email || !inputPassword) {
    throw new ApiError(400, "Please enter all fields");
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (user && (await user.matchPassword(inputPassword))) {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, user, "Login successful"));
  } else {
    throw new ApiError(401, "Invalid email or password");
  }
});


 const logoutUser = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return res
      .status(200)
      .json(new ApiResponse(200, 'Logged out'));
};

export {  loginUser, sendOtpToEmail, verifyOtpAndSignup, logoutUser };
