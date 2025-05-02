const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
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
}, { _id: true });

const resumeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  template: {
    type: String,
    default: 'custom'
  },
  sections: [sectionSchema],
  canvasSize: {
    width: {
      type: Number,
      default: 800
    },
    height: {
      type: Number,
      default: 1100
    }
  },
  pageSettings: {
    pageSize: {
      type: String,
      default: 'A4'
    },
    orientation: {
      type: String,
      default: 'portrait',
      enum: ['portrait', 'landscape']
    },
    margins: {
      top: {
        type: Number,
        default: 20
      },
      right: {
        type: Number,
        default: 20
      },
      bottom: {
        type: Number,
        default: 20
      },
      left: {
        type: Number,
        default: 20
      }
    }
  },
  collaborators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Resume = mongoose.model('Resume', resumeSchema);

module.exports = Resume; 