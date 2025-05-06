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

/**
 * Calculate ATS compatibility score for a resume
 * @param {string} resumeText - The resume text 
 * @param {Object} analysisResult - Previous analysis results if available
 * @returns {Object} ATS score analysis
 */
const calculateATSCompatibility = (resumeText, analysisResult = {}) => {
  // Base score starts at 65%
  let baseScore = 65;
  
  // Initialize subsections
  const scoring = {
    formatting: 0,
    keywords: 0,
    readability: 0,
    structure: 0
  };
  
  // Check formatting
  // 1. File format is already handled since we can parse it
  scoring.formatting += 20;
  
  // 2. Check for common formatting issues
  const hasWeirdCharacters = /[^\x00-\x7F]+/.test(resumeText);
  if (!hasWeirdCharacters) scoring.formatting += 20;
  
  // 3. Check for appropriate length (not too short, not too long)
  const wordCount = resumeText.split(/\s+/).length;
  if (wordCount > 300 && wordCount < 1000) scoring.formatting += 20;
  else if (wordCount > 200) scoring.formatting += 10;
  
  // 4. Check for common resume sections
  const sections = [
    'experience', 'education', 'skills', 'summary', 
    'objective', 'projects', 'certifications'
  ];
  
  let sectionCount = 0;
  for (const section of sections) {
    if (resumeText.toLowerCase().includes(section)) {
      sectionCount++;
    }
  }
  
  if (sectionCount >= 4) scoring.formatting += 20;
  else if (sectionCount >= 2) scoring.formatting += 10;
  
  // 5. Check for contact information
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(resumeText);
  const hasPhone = /(\+\d{1,3}[ -]?)?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}/.test(resumeText);
  
  if (hasEmail) scoring.formatting += 10;
  if (hasPhone) scoring.formatting += 10;
  
  // Keywords score - use match score if available or estimate
  if (analysisResult.matchScore) {
    scoring.keywords = analysisResult.matchScore;
  } else {
    // Simple keyword density calculation
    const commonJobKeywords = [
      'experience', 'skills', 'project', 'developed', 'managed', 'led', 'team',
      'collaborate', 'implement', 'create', 'design', 'analyze', 'solve', 'responsible',
      'achieve', 'improve', 'increase', 'decrease', 'percent', 'budget', 'client',
      'customer', 'timeline', 'deliver', 'success', 'goal', 'metric'
    ];
    
    let keywordCount = 0;
    for (const keyword of commonJobKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = resumeText.match(regex);
      if (matches) keywordCount += matches.length;
    }
    
    const density = keywordCount / wordCount;
    scoring.keywords = Math.min(Math.round(density * 1000), 100);
  }
  
  // Readability score
  // Count sentences
  const sentences = resumeText.split(/[.!?]+/).filter(Boolean);
  const avgWordsPerSentence = wordCount / Math.max(sentences.length, 1);
  
  if (avgWordsPerSentence >= 10 && avgWordsPerSentence <= 20) {
    scoring.readability = 80;
  } else if (avgWordsPerSentence > 20 && avgWordsPerSentence <= 25) {
    scoring.readability = 70;
  } else if (avgWordsPerSentence > 25) {
    scoring.readability = 60;
  } else {
    scoring.readability = 75;
  }
  
  // Structure score - check for bullet points, consistent formatting
  const bulletPoints = (resumeText.match(/•|-|\*/g) || []).length;
  const hasConsistentFormatting = /\n[A-Z][^a-z]*\n/.test(resumeText); // Headings in all caps
  
  if (bulletPoints > 10) scoring.structure += 40;
  else if (bulletPoints > 5) scoring.structure += 30;
  else scoring.structure += 20;
  
  if (hasConsistentFormatting) scoring.structure += 40;
  else scoring.structure += 20;
  
  // Calculate final score
  const atsScore = Math.round(
    scoring.formatting * 0.3 + 
    scoring.keywords * 0.4 + 
    scoring.readability * 0.15 + 
    scoring.structure * 0.15
  );
  
  return {
    score: atsScore,
    details: scoring
  };
};

export const analyzeMatch = async (req, res) => {
  try {
    // Validate input
    if (!req.file) {
      return res.status(400).json({ message: 'Resume file is required' });
    }

    if (!req.body.jobDescription || req.body.jobDescription.trim().length < 10) {
      return res.status(400).json({ message: 'A valid job description is required (minimum 10 characters)' });
    }

    // Extract text from the resume file
    let resumeText;
    try {
      resumeText = await extractTextFromFile(req.file);
      
      if (!resumeText || resumeText.trim().length < 50) {
        return res.status(400).json({ message: 'Could not extract sufficient text from the resume. Please ensure the file is not corrupted or empty.' });
      }
    } catch (extractError) {
      console.error('Error extracting text from file:', extractError);
      return res.status(422).json({ message: 'Could not process the resume file. Please try a different file format.' });
    }

    const jobDescription = req.body.jobDescription;

    // Ensure API key is available
    if (!config.geminiApiKey) {
      console.error('Missing Gemini API key');
      return res.status(500).json({ message: 'Server configuration error. Please try again later.' });
    }

    try {
      // Initialize Gemini AI model
      const genAI = new GoogleGenerativeAI(config.geminiApiKey);
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
      let analysis;
      try {
        analysis = JSON.parse(analysisText);
        
        // Validate the required fields
        if (typeof analysis.matchScore !== 'number') {
          throw new Error('Invalid matchScore format');
        }
        
        if (!Array.isArray(analysis.matchedSkills)) {
          analysis.matchedSkills = [];
        }
        
        if (!Array.isArray(analysis.missingSkills)) {
          analysis.missingSkills = [];
        }
        
        if (typeof analysis.recommendations !== 'string') {
          analysis.recommendations = 'No specific recommendations available.';
        }
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError, analysisText);
        // Fallback to a default response structure
        analysis = {
          matchScore: 50,
          matchedSkills: [],
          missingSkills: [],
          recommendations: 'Sorry, we encountered an issue processing the analysis. Here are some general tips: Tailor your resume to match the job description, highlight relevant skills, and quantify your achievements.'
        };
      }
      
      // Calculate ATS score
      const atsAnalysis = calculateATSCompatibility(resumeText, analysis);
      analysis.atsScore = atsAnalysis.score;
      analysis.atsDetails = atsAnalysis.details;

      res.json(analysis);
    } catch (aiError) {
      console.error('AI analysis error:', aiError);
      res.status(500).json({ 
        message: 'Error analyzing resume with AI service. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? aiError.message : undefined
      });
    }
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      message: 'Failed to analyze resume match',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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