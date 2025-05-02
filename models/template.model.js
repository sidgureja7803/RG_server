const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  previewImage: {
    type: String,
    required: true
  },
  sections: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  style: {
    fontFamily: String,
    colors: [String],
    layout: String
  },
  category: {
    type: String,
    enum: ['professional', 'creative', 'simple', 'modern', 'academic'],
    default: 'professional'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  usageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const Template = mongoose.model('Template', templateSchema);

module.exports = Template; 