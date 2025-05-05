import { validationResult } from 'express-validator';
import Resume from '../models/resume.model.js';
import AnalysisResult from '../models/analysisResult.model.js';
import { analyzeResumeText, calculateATSScore, generateRecommendations } from '../utils/analyzer.utils.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import config from '../config/ai.config.js';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(config.geminiApiKey);

const extractTextFromFile = async (file) => {
  const buffer = file.buffer;
  let text = '';

  try {
    switch (file.mimetype) {
      case 'application/pdf':
        try {
          const pdfData = await pdfParse(buffer);
          text = pdfData.text;
        } catch (pdfError) {
          console.error('PDF parsing error:', pdfError);
          throw new Error('Failed to parse PDF file');
        }
        break;
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
        break;
      case 'text/plain':
        text = buffer.toString('utf-8');
        break;
      default:
        throw new Error('Unsupported file type');
    }
    return text;
  } catch (error) {
    console.error('Error extracting text:', error);
    throw new Error('Failed to extract text from file');
  }
};

export const analyzeMatch = async (req, res) => {
  try {
    if (!req.file || !req.body.jobDescription) {
      return res.status(400).json({ message: 'Resume file and job description are required' });
    }

    const resumeText = await extractTextFromFile(req.file);
    const jobDescription = req.body.jobDescription;

    // Initialize Gemini AI model
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Prepare the prompt for analysis
    const prompt = `
      Analyze the following resume and job description for compatibility.
      Please provide:
      1. An overall match score (0-100)
      2. List of matching skills found in both
      3. List of required skills from job description missing in resume
      4. Specific recommendations for improving the match
      
      Resume:
      ${resumeText}
      
      Job Description:
      ${jobDescription}
      
      Format the response as a JSON object with the following structure:
      {
        "matchScore": number,
        "matchedSkills": string[],
        "missingSkills": string[],
        "recommendations": string
      }
    `;

    // Generate analysis using Gemini AI
    const result = await model.generateContent(prompt);
    const response = result.response;
    const analysisText = response.text();
    
    // Parse the JSON response
    const analysis = JSON.parse(analysisText);

    res.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ message: 'Failed to analyze resume match' });
  }
};

/**
 * Analyze a resume without a specific job description
 * @route POST /api/analyzer/analyze
 */
export const analyzeResume = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
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

    // General analysis without a specific job
    const analysisResult = {
      resumeId: resume._id,
      userId,
      generalFeedback: generateRecommendations(resumeText),
      atsScore: calculateATSScore(resumeText),
      timestamp: new Date(),
      resumeTitle: resume.title
    };

    res.json(analysisResult);
  } catch (error) {
    console.error('Resume analysis error:', error);
    res.status(500).json({ message: 'Server error during resume analysis' });
  }
};

/**
 * Analyze a resume against a specific job description
 * @route POST /api/analyzer/analyze-with-job
 */
export const analyzeResumeWithJobDescription = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { resumeId, jobDescription } = req.body;
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

    // Analyze resume against job description
    const analysisResult = await analyzeResumeText(resumeText, jobDescription);

    // Add metadata
    analysisResult.resumeId = resume._id;
    analysisResult.userId = userId;
    analysisResult.timestamp = new Date();
    analysisResult.resumeTitle = resume.title;
    analysisResult.jobDescription = jobDescription;

    res.json(analysisResult);
  } catch (error) {
    console.error('Resume analysis error:', error);
    res.status(500).json({ message: 'Server error during resume analysis' });
  }
};

/**
 * Get analysis history for the user
 * @route GET /api/analyzer/history
 */
export const getAnalysisHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all analysis results for the user
    const history = await AnalysisResult.find({ userId })
      .sort({ timestamp: -1 })
      .select('resumeId resumeTitle timestamp matchScore atsScore'); // Only return necessary fields
    
    res.json(history);
  } catch (error) {
    console.error('Error fetching analysis history:', error);
    res.status(500).json({ message: 'Server error fetching analysis history' });
  }
};

/**
 * Save an analysis result
 * @route POST /api/analyzer/save
 */
export const saveAnalysisResult = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { resumeId, analysisResult, jobDescription } = req.body;
    const userId = req.user.id;

    // Create a new analysis result
    const newAnalysisResult = new AnalysisResult({
      resumeId,
      userId,
      analysisData: analysisResult,
      jobDescription: jobDescription || '',
      timestamp: new Date()
    });

    // Save to database
    await newAnalysisResult.save();

    res.status(201).json({ 
      message: 'Analysis saved successfully',
      analysisId: newAnalysisResult._id
    });
  } catch (error) {
    console.error('Error saving analysis result:', error);
    res.status(500).json({ message: 'Server error saving analysis result' });
  }
}; 