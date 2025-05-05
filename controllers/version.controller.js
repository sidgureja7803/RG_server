import Version from '../models/version.model.js';
import Resume from '../models/resume.model.js';

// @desc    Create a new version
// @route   POST /api/resumes/:resumeId/versions
// @access  Private
export const createVersion = async (req, res) => {
  try {
    const { resumeId } = req.params;
    const { sections, description } = req.body;

    // Get the resume to verify ownership/collaboration rights
    const resume = await Resume.findById(resumeId);
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Check authorization
    if (resume.user.toString() !== req.user._id.toString() && 
        !resume.collaborators.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to create versions for this resume' });
    }

    // Get the latest version number
    const latestVersion = await Version.findOne({ resume: resumeId })
      .sort({ versionNumber: -1 });
    
    const versionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    // Create new version
    const version = await Version.create({
      resume: resumeId,
      user: req.user._id,
      versionNumber,
      sections,
      description
    });

    res.status(201).json(version);
  } catch (error) {
    res.status(500).json({
      message: 'Error creating version',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all versions of a resume
// @route   GET /api/resumes/:resumeId/versions
// @access  Private
export const getVersions = async (req, res) => {
  try {
    const { resumeId } = req.params;
    
    // Get the resume to verify ownership/collaboration rights
    const resume = await Resume.findById(resumeId);
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Check authorization
    if (resume.user.toString() !== req.user._id.toString() && 
        !resume.collaborators.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to view versions of this resume' });
    }

    const versions = await Version.find({ resume: resumeId })
      .sort({ versionNumber: -1 })
      .populate('user', 'username email');

    res.json(versions);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching versions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get a specific version
// @route   GET /api/resumes/:resumeId/versions/:versionNumber
// @access  Private
export const getVersion = async (req, res) => {
  try {
    const { resumeId, versionNumber } = req.params;
    
    // Get the resume to verify ownership/collaboration rights
    const resume = await Resume.findById(resumeId);
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Check authorization
    if (resume.user.toString() !== req.user._id.toString() && 
        !resume.collaborators.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to view this version' });
    }

    const version = await Version.findOne({ 
      resume: resumeId,
      versionNumber: parseInt(versionNumber)
    }).populate('user', 'username email');

    if (!version) {
      return res.status(404).json({ message: 'Version not found' });
    }

    res.json(version);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching version',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Restore a specific version
// @route   POST /api/resumes/:resumeId/versions/:versionNumber/restore
// @access  Private
export const restoreVersion = async (req, res) => {
  try {
    const { resumeId, versionNumber } = req.params;
    
    // Get the resume to verify ownership/collaboration rights
    const resume = await Resume.findById(resumeId);
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Check authorization
    if (resume.user.toString() !== req.user._id.toString() && 
        !resume.collaborators.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to restore versions' });
    }

    const version = await Version.findOne({ 
      resume: resumeId,
      versionNumber: parseInt(versionNumber)
    });

    if (!version) {
      return res.status(404).json({ message: 'Version not found' });
    }

    // Update resume with version content
    resume.sections = version.sections;
    resume.lastModified = Date.now();
    await resume.save();

    // Create new version to track the restoration
    const newVersion = await Version.create({
      resume: resumeId,
      user: req.user._id,
      versionNumber: (await Version.findOne({ resume: resumeId }).sort({ versionNumber: -1 })).versionNumber + 1,
      sections: version.sections,
      description: `Restored from version ${versionNumber}`
    });

    res.json({ 
      message: 'Version restored successfully',
      version: newVersion
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error restoring version',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}; 