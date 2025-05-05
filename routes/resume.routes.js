import express from 'express';
import { 
  createResume, 
  getResumes, 
  getResumeById, 
  updateResume, 
  deleteResume,
  addCollaborator,
  removeCollaborator,
  generateResumePDF,
  previewResumePDF
} from '../controllers/resume.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import versionRoutes from './version.routes.js';
import commentRoutes from './comment.routes.js';

const router = express.Router();

// Protect all resume routes
router.use(authenticate);

// Mount version routes
router.use('/:resumeId/versions', versionRoutes);

// Mount comment routes
router.use('/:resumeId/comments', commentRoutes);

// @route   POST /api/resumes
// @desc    Create a new resume
// @access  Private
router.post('/', createResume);

// @route   GET /api/resumes
// @desc    Get all resumes for current user
// @access  Private
router.get('/', getResumes);

// @route   GET /api/resumes/:id
// @desc    Get a single resume by ID
// @access  Private
router.get('/:id', getResumeById);

// @route   PUT /api/resumes/:id
// @desc    Update a resume
// @access  Private
router.put('/:id', updateResume);

// @route   DELETE /api/resumes/:id
// @desc    Delete a resume
// @access  Private
router.delete('/:id', deleteResume);

// @route   GET /api/resumes/:id/pdf
// @desc    Generate a PDF for a resume
// @access  Private
router.get('/:id/pdf', generateResumePDF);

// @route   GET /api/resumes/:id/preview
// @desc    Preview a PDF for a resume
// @access  Private
router.get('/:id/preview', previewResumePDF);

// @route   POST /api/resumes/:id/collaborators
// @desc    Add a collaborator to a resume
// @access  Private
router.post('/:id/collaborators', addCollaborator);

// @route   DELETE /api/resumes/:id/collaborators/:collaboratorId
// @desc    Remove a collaborator from a resume
// @access  Private
router.delete('/:id/collaborators/:collaboratorId', removeCollaborator);

export default router; 