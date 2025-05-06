import Resume from '../models/resume.model.js';
import mongoose from 'mongoose';
import { generatePDF, resumeToHTML } from '../services/pdf.service.js';

// @desc    Create a new resume
// @route   POST /api/resumes
// @access  Private
export const createResume = async (req, res) => {
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
export const getResumes = async (req, res) => {
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
export const getResumeById = async (req, res) => {
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
export const updateResume = async (req, res) => {
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
export const deleteResume = async (req, res) => {
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
export const addCollaborator = async (req, res) => {
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
export const removeCollaborator = async (req, res) => {
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

// @desc    Generate a PDF for a resume
// @route   GET /api/resumes/:id/pdf
// @access  Private
export const generateResumePDF = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Check if user is authorized to view this resume
    if (resume.user.toString() !== req.user._id.toString() && 
        !resume.collaborators.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to access this resume' });
    }

    const pdf = await generatePDF(resume);

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${resume.name.replace(/\s+/g, '_')}.pdf"`);
    
    res.send(pdf);
  } catch (error) {
    res.status(500).json({
      message: 'Error generating PDF',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Preview a PDF for a resume
// @route   GET /api/resumes/:id/preview
// @access  Private
export const previewResumePDF = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Check if user is authorized to view this resume
    if (resume.user.toString() !== req.user._id.toString() && 
        !resume.collaborators.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to access this resume' });
    }

    const html = await resumeToHTML(resume);
    
    // Set headers for HTML response
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    res.status(500).json({
      message: 'Error generating preview',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Convert markdown resume to HTML
 * @route POST /api/resumes/convert-markdown
 * @access Public
 */
export const convertMarkdownToHTML = async (req, res) => {
  try {
    const { markdown } = req.body;
    
    if (!markdown) {
      return res.status(400).json({ message: 'Markdown content is required' });
    }
    
    // Use a markdown to HTML converter
    const html = await markdownToHTML(markdown);
    
    res.json({ html });
  } catch (error) {
    res.status(500).json({
      message: 'Error converting markdown to HTML',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Export resume as markdown
 * @route GET /api/resumes/:id/export-markdown
 * @access Private
 */
export const exportResumeMarkdown = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Check if user is authorized to access this resume
    if (resume.user.toString() !== req.user._id.toString() && 
        !resume.collaborators.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to access this resume' });
    }
    
    // If resume is in markdown format, return it directly
    if (resume.format === 'markdown') {
      return res.json({ markdown: resume.content });
    }
    
    // If resume is in another format, convert it to markdown
    // This is a placeholder for actual conversion logic
    const markdown = resume.content; // Simplified conversion
    
    res.json({ markdown });
  } catch (error) {
    res.status(500).json({
      message: 'Error exporting resume as markdown',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Helper function: Convert markdown to HTML
 * For actual implementation, you might want to use a library like marked
 */
const markdownToHTML = async (markdown) => {
  // Import here to avoid issues if not all users need this dependency
  const marked = (await import('marked')).marked;
  
  // Configure marked for safe HTML
  marked.setOptions({
    headerIds: true,
    mangle: false,
    sanitize: false, // Let users have full control over their HTML
    breaks: true,
  });
  
  return marked(markdown);
}; 