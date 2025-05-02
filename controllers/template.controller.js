const Template = require('../models/template.model');

// @desc    Get all public templates
// @route   GET /api/templates
// @access  Public
const getTemplates = async (req, res) => {
  try {
    const { category } = req.query;
    
    // Filter by category if provided
    const filter = { isPublic: true };
    if (category) {
      filter.category = category;
    }
    
    const templates = await Template.find(filter)
      .sort({ usageCount: -1 });
    
    res.json(templates);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching templates',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get a single template by ID
// @route   GET /api/templates/:id
// @access  Public
const getTemplateById = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // If template is not public, check if user is the creator
    if (!template.isPublic) {
      if (!req.user || template.creator.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to access this template' });
      }
    }

    res.json(template);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching template',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Create a new template
// @route   POST /api/templates
// @access  Private (Admin)
const createTemplate = async (req, res) => {
  try {
    const { name, previewImage, sections, style, category, isPublic } = req.body;
    
    // Create new template
    const template = await Template.create({
      name,
      previewImage,
      sections,
      style,
      category: category || 'professional',
      isPublic: isPublic !== undefined ? isPublic : true,
      creator: req.user._id
    });

    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({
      message: 'Error creating template',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update template usage count
// @route   PUT /api/templates/:id/usage
// @access  Private
const incrementUsageCount = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Increment usage count
    template.usageCount += 1;
    await template.save();

    res.json({ success: true, usageCount: template.usageCount });
  } catch (error) {
    res.status(500).json({
      message: 'Error updating template usage',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getTemplates,
  getTemplateById,
  createTemplate,
  incrementUsageCount
}; 