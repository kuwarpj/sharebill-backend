import mongoose from 'mongoose';

const groupInvitationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required for invitation'],
    trim: true,
    lowercase: true,
    match: [/.+\@.+\..+/, 'Please fill a valid email address'],
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  acceptedAt: {
    type: Date,
  },
  declinedAt: {
    type: Date,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // expires in 7 days
  },
});

// 🛡️ Compound index to prevent duplicate pending invitations for same email + group
groupInvitationSchema.index(
  { email: 1, groupId: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

// 🧼 Clean JSON output
groupInvitationSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

const GroupInvitation = mongoose.model('GroupInvitation', groupInvitationSchema);
export default GroupInvitation;
