import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  salary: {
    type: String,
    default: 'Not specified'
  },
  jobType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship', 'Remote'],
    default: 'Full-time'
  },
  applicationUrl: {
    type: String,
    required: true
  },
  source: {
    type: String,
    required: true,
    default: 'Unknown'
  },
  datePosted: {
    type: Date,
    default: Date.now
  },
  skills: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create indexes for better search performance
jobSchema.index({ title: 'text', description: 'text', company: 'text', skills: 'text' });
jobSchema.index({ location: 1 });
jobSchema.index({ datePosted: -1 });

const Job = mongoose.model('Job', jobSchema);

export default Job; 