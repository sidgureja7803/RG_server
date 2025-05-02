const Resume = require('../models/resume.model');
const mongoose = require('mongoose');

// @desc    Create a new resume
// @route   POST /api/resumes
// @access  Private
const createResume = async (req, res) => {
  try {
    const { name, template, sections, canvasSize, pageSettings } = req.body;
    
    const resume = await Resume.create({
      name,
      user: req.user._id,
      template: template || 'custom',
      sections: sections || [],
      canvasSize,
      pageSettings
    });

    res.status(201).json(resume);
  } catch (error) {
    res.status(500).json({
      message: 'Error creating resume',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all resumes for current user
// @route   GET /api/resumes
// @access  Private
const getResumes = async (req, res) => {
  try {
    const resumes = await Resume.find({ 
      $or: [
        { user: req.user._id },
        { collaborators: req.user._id }
      ]
    }).sort({ updatedAt: -1 });
    
    res.json(resumes);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching resumes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get a single resume by ID
// @route   GET /api/resumes/:id
// @access  Private
const getResumeById = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id)
      .populate('user', 'username email profilePicture')
      .populate('collaborators', 'username email profilePicture');
    
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Check if user is authorized to view this resume
    if (resume.user._id.toString() !== req.user._id.toString() && 
        !resume.collaborators.some(c => c._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to access this resume' });
    }

    res.json(resume);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching resume',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update a resume
// @route   PUT /api/resumes/:id
// @access  Private
const updateResume = async (req, res) => {
  try {
    const { name, sections, canvasSize, pageSettings } = req.body;
    
    const resume = await Resume.findById(req.params.id);
    
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Check if user is authorized to update this resume
    if (resume.user.toString() !== req.user._id.toString() &&
        !resume.collaborators.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to update this resume' });
    }

    // Update fields
    if (name) resume.name = name;
    if (sections) resume.sections = sections;
    if (canvasSize) resume.canvasSize = canvasSize;
    if (pageSettings) resume.pageSettings = pageSettings;
    resume.lastModified = Date.now();

    await resume.save();
    res.json(resume);
  } catch (error) {
    res.status(500).json({
      message: 'Error updating resume',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete a resume
// @route   DELETE /api/resumes/:id
// @access  Private
const deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Check if user is the owner of this resume
    if (resume.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this resume' });
    }

    await resume.deleteOne();
    res.json({ message: 'Resume removed' });
  } catch (error) {
    res.status(500).json({
      message: 'Error deleting resume',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Add a collaborator to a resume
// @route   POST /api/resumes/:id/collaborators
// @access  Private
const addCollaborator = async (req, res) => {
  try {
    const { collaboratorId } = req.body;
    
    const resume = await Resume.findById(req.params.id);
    
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Check if user is the owner of this resume
    if (resume.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can add collaborators' });
    }

    // Check if collaborator already added
    if (resume.collaborators.includes(collaboratorId)) {
      return res.status(400).json({ message: 'User is already a collaborator' });
    }

    resume.collaborators.push(collaboratorId);
    await resume.save();
    
    res.json(resume);
  } catch (error) {
    res.status(500).json({
      message: 'Error adding collaborator',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Remove a collaborator from a resume
// @route   DELETE /api/resumes/:id/collaborators/:collaboratorId
// @access  Private
const removeCollaborator = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Check if user is the owner of this resume
    if (resume.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can remove collaborators' });
    }

    // Remove collaborator
    resume.collaborators = resume.collaborators.filter(
      c => c.toString() !== req.params.collaboratorId
    );

    await resume.save();
    res.json(resume);
  } catch (error) {
    res.status(500).json({
      message: 'Error removing collaborator',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createResume,
  getResumes,
  getResumeById,
  updateResume,
  deleteResume,
  addCollaborator,
  removeCollaborator
}; 