import mongoose from 'mongoose';

const analysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resumeContent: {
    type: String,
    required: true
  },
  jobDescription: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  missingKeywords: [{
    type: String
  }],
  recommendations: [{
    type: String
  }],
  jobKeywords: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
analysisSchema.index({ userId: 1, createdAt: -1 });

const Analysis = mongoose.model('Analysis', analysisSchema);

export default Analysis; 