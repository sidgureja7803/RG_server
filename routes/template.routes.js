const express = require('express');
const { 
  getTemplates, 
  getTemplateById, 
  createTemplate, 
  incrementUsageCount 
} = require('../controllers/template.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// Public routes
router.get('/', getTemplates);
router.get('/:id', getTemplateById);

// Protected routes
router.post('/', authenticate, createTemplate);
router.put('/:id/usage', authenticate, incrementUsageCount);

module.exports = router; 