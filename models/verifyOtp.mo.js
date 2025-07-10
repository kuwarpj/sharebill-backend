import mongoose from "mongoose";

const otpVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
  },
  otpExpires: {
    type: Date,
    required: true,
  },
});

otpVerificationSchema.index({ email: 1 }, { unique: true });

const OtpVerification = mongoose.model("OtpVerification", otpVerificationSchema);

export default OtpVerification