import mongoose from 'mongoose';

const analysisResultSchema = new mongoose.Schema({
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  analysisData: {
    type: Object,
    required: true
  },
  jobDescription: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  resumeTitle: {
    type: String,
    default: 'Untitled Resume'
  },
  matchScore: {
    type: Number,
    default: 0
  },
  atsScore: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Virtual property for formatting the timestamp
analysisResultSchema.virtual('formattedTimestamp').get(function() {
  return this.timestamp.toLocaleString();
});

// Create index for faster queries
analysisResultSchema.index({ userId: 1, timestamp: -1 });

const AnalysisResult = mongoose.model('AnalysisResult', analysisResultSchema);

export default AnalysisResult; 