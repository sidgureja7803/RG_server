import express from 'express';
import { 
  createVersion,
  getVersions,
  getVersion,
  restoreVersion
} from '../controllers/version.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { body } from 'express-validator';

const router = express.Router({ mergeParams: true }); // Enable access to parent router params

// Protect all version routes
router.use(authenticate);

// Create a new version
router.post('/', [
  body('sections').isArray(),
  body('description').notEmpty().trim()
], createVersion);

// Get all versions
router.get('/', getVersions);

// Get specific version
router.get('/:versionNumber', getVersion);

// Restore version
router.post('/:versionNumber/restore', restoreVersion);

export default router; 