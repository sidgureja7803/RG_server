import mongoose from 'mongoose';

const latexDocumentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  code: {
    type: String,
    required: true,
    default: ''
  },
  title: {
    type: String,
    required: true,
    default: 'Untitled Document'
  },
  template: {
    type: String,
    default: null
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update lastModified timestamp on save
latexDocumentSchema.pre('save', function(next) {
  this.lastModified = new Date();
  next();
});

const LatexDocument = mongoose.model('LatexDocument', latexDocumentSchema);

export default LatexDocument; 