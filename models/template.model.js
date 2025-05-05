import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    required: true
  },
  previewImage: {
    type: String,
    required: true
  },
  features: [{
    type: String
  }],
  structure: {
    type: Object,
    required: true
  },
  category: {
    type: String,
    enum: ['Modern', 'Professional', 'Creative', 'Simple', 'Academic'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  },
  metadata: {
    colors: [{
      name: String,
      value: String
    }],
    fonts: [{
      name: String,
      value: String
    }],
    spacing: {
      type: Object
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

templateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Template = mongoose.model('Template', templateSchema);

export default Template; 