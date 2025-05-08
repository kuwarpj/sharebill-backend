import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  iconUrl: {
    type: String,
    default: function() {
        return `https://picsum.photos/seed/${this.name.replace(/\s+/g, '-') || 'defaultgroup'}/200/200`;
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure virtuals are included when converting to JSON and to remove _id and __v
groupSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});


const Group = mongoose.model('Group', groupSchema);

export default Group;
