import Comment from '../models/comment.model.js';
import Resume from '../models/resume.model.js';
import { notifyResumeUpdate } from '../services/collaboration.service.js';

// @desc    Create a new comment
// @route   POST /api/resumes/:resumeId/comments
// @access  Private
export const createComment = async (req, res) => {
  try {
    const { resumeId } = req.params;
    const { content, section, position, parentComment } = req.body;

    // Check if resume exists and user has access
    const resume = await Resume.findById(resumeId);
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    if (resume.user.toString() !== req.user._id.toString() && 
        !resume.collaborators.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to comment on this resume' });
    }

    // Create comment
    const comment = await Comment.create({
      resume: resumeId,
      user: req.user._id,
      content,
      section,
      position,
      parentComment
    });

    // Populate user info
    await comment.populate('user', 'username email profilePicture');

    // Notify collaborators
    notifyResumeUpdate(resumeId, {
      type: 'comment_added',
      data: comment
    });

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({
      message: 'Error creating comment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all comments for a resume
// @route   GET /api/resumes/:resumeId/comments
// @access  Private
export const getComments = async (req, res) => {
  try {
    const { resumeId } = req.params;
    const { section } = req.query;

    // Check if resume exists and user has access
    const resume = await Resume.findById(resumeId);
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    if (resume.user.toString() !== req.user._id.toString() && 
        !resume.collaborators.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to view comments' });
    }

    // Build query
    const query = { resume: resumeId };
    if (section) {
      query.section = section;
    }

    // Get comments
    const comments = await Comment.find(query)
      .populate('user', 'username email profilePicture')
      .populate('resolvedBy', 'username email profilePicture')
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching comments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update a comment
// @route   PUT /api/resumes/:resumeId/comments/:commentId
// @access  Private
export const updateComment = async (req, res) => {
  try {
    const { resumeId, commentId } = req.params;
    const { content } = req.body;

    // Check if resume exists and user has access
    const resume = await Resume.findById(resumeId);
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Get comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is comment author
    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this comment' });
    }

    // Update comment
    comment.content = content;
    await comment.save();

    // Populate user info
    await comment.populate('user', 'username email profilePicture');

    // Notify collaborators
    notifyResumeUpdate(resumeId, {
      type: 'comment_updated',
      data: comment
    });

    res.json(comment);
  } catch (error) {
    res.status(500).json({
      message: 'Error updating comment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete a comment
// @route   DELETE /api/resumes/:resumeId/comments/:commentId
// @access  Private
export const deleteComment = async (req, res) => {
  try {
    const { resumeId, commentId } = req.params;

    // Check if resume exists and user has access
    const resume = await Resume.findById(resumeId);
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Get comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is comment author or resume owner
    if (comment.user.toString() !== req.user._id.toString() && 
        resume.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    // Delete comment and all replies
    await Comment.deleteMany({
      $or: [
        { _id: commentId },
        { parentComment: commentId }
      ]
    });

    // Notify collaborators
    notifyResumeUpdate(resumeId, {
      type: 'comment_deleted',
      data: { commentId }
    });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({
      message: 'Error deleting comment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Resolve/unresolve a comment
// @route   PUT /api/resumes/:resumeId/comments/:commentId/resolve
// @access  Private
export const toggleCommentResolution = async (req, res) => {
  try {
    const { resumeId, commentId } = req.params;

    // Check if resume exists and user has access
    const resume = await Resume.findById(resumeId);
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    if (resume.user.toString() !== req.user._id.toString() && 
        !resume.collaborators.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to manage comments' });
    }

    // Get comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Toggle resolved status
    comment.isResolved = !comment.isResolved;
    comment.resolvedBy = comment.isResolved ? req.user._id : undefined;
    await comment.save();

    // Populate user info
    await comment.populate([
      { path: 'user', select: 'username email profilePicture' },
      { path: 'resolvedBy', select: 'username email profilePicture' }
    ]);

    // Notify collaborators
    notifyResumeUpdate(resumeId, {
      type: 'comment_resolution_toggled',
      data: comment
    });

    res.json(comment);
  } catch (error) {
    res.status(500).json({
      message: 'Error toggling comment resolution',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}; 