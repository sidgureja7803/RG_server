import { validationResult } from 'express-validator';
import Job from '../models/job.model.js';
import Resume from '../models/resume.model.js';
import { analyzeWithAI } from '../config/ai.config.js';

/**
 * @route   POST /api/jobs/search
 * @desc    Search jobs based on query and optional location
 * @access  Private
 */
export const searchJobsController = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { query, location } = req.body;
    
    // Build search query
    const searchQuery = {
      $text: { $search: query }
    };
    
    // Add location filter if provided
    if (location) {
      searchQuery.location = { $regex: new RegExp(location, 'i') };
    }
    
    // Find jobs matching the criteria
    const jobs = await Job.find(searchQuery)
      .sort({ datePosted: -1 })
      .limit(20);
    
    res.json(jobs);
  } catch (error) {
    console.error('Job search error:', error);
    res.status(500).json({ message: 'Server error during job search' });
  }
};

/**
 * @route   POST /api/jobs/recommendations
 * @desc    Get job recommendations based on resume content
 * @access  Private
 */
export const getJobRecommendationsController = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { resumeId } = req.body;
    const userId = req.user.id;
    
    // Get the resume
    const resume = await Resume.findOne({ _id: resumeId, user: userId });
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    
    // Extract text from resume sections
    let resumeText = '';
    for (const section of resume.sections) {
      resumeText += section.content + '\n';
    }
    
    // Use AI to extract keywords from resume
    let keywordsText = '';
    if (process.env.AI_PROVIDER) {
      try {
        const aiPrompt = `Extract the top 10 professional skills and keywords from this resume, separated by commas:
        
        ${resumeText}`;
        
        keywordsText = await analyzeWithAI(aiPrompt, 'extract-keywords', process.env.AI_PROVIDER);
        // Clean up the keywords
        keywordsText = keywordsText.replace(/\d+\.\s*/g, '').replace(/\n/g, ', ');
      } catch (aiError) {
        console.error('AI keyword extraction error:', aiError);
        // Fall back to basic extraction
        keywordsText = resumeText;
      }
    } else {
      keywordsText = resumeText;
    }
    
    // Find jobs matching the keywords
    const jobs = await Job.find({
      $text: { $search: keywordsText }
    })
      .sort({ datePosted: -1 })
      .limit(10);
    
    res.json({
      jobs,
      keywords: keywordsText.split(',').map(kw => kw.trim()).filter(kw => kw.length > 0)
    });
  } catch (error) {
    console.error('Job recommendations error:', error);
    res.status(500).json({ message: 'Server error getting job recommendations' });
  }
}; 