import Template from '../models/template.model.js';
import { validationResult } from 'express-validator';
import fs from 'fs';
import path from 'path';

// @desc    Get all public templates
// @route   GET /api/templates
// @access  Public
export const getTemplates = async (req, res) => {
  try {
    const { category, isPremium } = req.query;
    const filter = { isActive: true };
    
    if (category) filter.category = category;
    if (isPremium !== undefined) filter.isPremium = isPremium === 'true';

    const templates = await Template.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .select('-structure'); // Don't send structure in list view

    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ message: 'Server error fetching templates' });
  }
};

// @desc    Get a single template by ID
// @route   GET /api/templates/:id
// @access  Public
export const getTemplateById = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ message: 'Server error fetching template' });
  }
};

// @desc    Upload template images (thumbnail & preview)
// @route   POST /api/templates/upload-image
// @access  Private (Admin)
export const uploadTemplateImage = async (req, res) => {
  try {
    if (!req.files) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = {};

    if (req.files.thumbnail) {
      const thumbnailPath = `/templates/${req.files.thumbnail[0].filename}`;
      result.thumbnail = `${baseUrl}${thumbnailPath}`;
    }

    if (req.files.previewImage) {
      const previewPath = `/templates/${req.files.previewImage[0].filename}`;
      result.previewImage = `${baseUrl}${previewPath}`;
    }

    res.json(result);
  } catch (error) {
    console.error('Error uploading template images:', error);
    res.status(500).json({ message: 'Server error uploading template images' });
  }
};

// @desc    Create a new template
// @route   POST /api/templates
// @access  Private (Admin)
export const createTemplate = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const newTemplate = new Template(req.body);
    await newTemplate.save();
    res.status(201).json(newTemplate);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ message: 'Server error creating template' });
  }
};

// @desc    Update template usage count
// @route   PUT /api/templates/:id/usage
// @access  Private
export const incrementUsageCount = async (req, res) => {
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

// @desc    Update template (admin only)
// @route   PUT /api/templates/:id
// @access  Private (Admin)
export const updateTemplate = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    // If thumbnail or previewImage URLs are being updated, delete old files
    if (req.body.thumbnail && req.body.thumbnail !== template.thumbnail) {
      deleteFileFromUrl(template.thumbnail);
    }
    
    if (req.body.previewImage && req.body.previewImage !== template.previewImage) {
      deleteFileFromUrl(template.previewImage);
    }
    
    const updatedTemplate = await Template.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ message: 'Server error updating template' });
  }
};

// @desc    Delete template (admin only)
// @route   DELETE /api/templates/:id
// @access  Private (Admin)
export const deleteTemplate = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    // Delete template images
    deleteFileFromUrl(template.thumbnail);
    deleteFileFromUrl(template.previewImage);
    
    // Delete the template
    await Template.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ message: 'Server error deleting template' });
  }
};

// Helper function to delete files from URLs
const deleteFileFromUrl = (url) => {
  if (!url) return;
  
  try {
    // Extract filename from URL
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Get the path to the file 
    const filepath = path.join(process.cwd(), 'public', pathname);
    
    // Check if file exists and delete
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log(`Deleted: ${filepath}`);
    }
  } catch (error) {
    console.error(`Error deleting file: ${url}`, error);
  }
}; 