import mongoose from 'mongoose';

const versionSchema = new mongoose.Schema({
  resume: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  versionNumber: {
    type: Number,
    required: true
  },
  sections: [{
    type: {
      type: String,
      required: true,
      enum: ['header', 'experience', 'education', 'skills', 'projects', 'certifications', 'custom']
    },
    title: String,
    position: {
      x: Number,
      y: Number
    },
    size: {
      width: Number,
      height: Number
    },
    content: mongoose.Schema.Types.Mixed,
    style: {
      fontFamily: String,
      fontSize: Number,
      fontWeight: String,
      color: String,
      backgroundColor: String,
      borderColor: String,
      borderWidth: Number,
      borderRadius: Number,
      padding: Number
    }
  }],
  description: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add index for efficient querying
versionSchema.index({ resume: 1, versionNumber: -1 });

const Version = mongoose.model('Version', versionSchema);

export default Version; 