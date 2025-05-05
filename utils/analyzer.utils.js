/**
 * Resume Analyzer Utilities
 * This module provides functions for analyzing resumes against job descriptions
 * and generating recommendations for improvement.
 */

import { analyzeWithAI } from '../config/ai.config.js';

/**
 * Analyze resume text against a job description
 * @param {string} resumeText - The resume text
 * @param {string} jobDescription - The job description text
 * @returns {Object} Analysis results
 */
export const analyzeResumeText = async (resumeText, jobDescription) => {
  try {
    // Get AI analysis for resume
    const resumeAnalysis = await analyzeWithAI(resumeText, 'resume', process.env.AI_PROVIDER);
    
    // Get AI analysis for job match if job description is provided
    let jobMatchAnalysis = null;
    if (jobDescription) {
      const combinedText = `Resume:\n${resumeText}\n\nJob Description:\n${jobDescription}`;
      jobMatchAnalysis = await analyzeWithAI(combinedText, 'job-match', process.env.AI_PROVIDER);
    }

    // Extract keywords from job description
    const jobKeywords = extractKeywords(jobDescription);
    
    // Extract keywords from resume
    const resumeKeywords = extractKeywords(resumeText);
    
    // Find matching keywords
    const matchedKeywords = findMatchingKeywords(jobKeywords, resumeKeywords, jobDescription);
    
    // Find missing keywords
    const missingKeywords = findMissingKeywords(jobKeywords, resumeKeywords, jobDescription);
    
    // Calculate match score
    const keywordMatchPercent = calculateKeywordMatchPercentage(matchedKeywords.length, missingKeywords.length);
    
    // Calculate ATS score
    const atsScore = calculateATSScore(resumeText, jobDescription, matchedKeywords.length);
    
    // Generate section-specific recommendations
    const sectionRecommendations = generateSectionRecommendations(resumeText, jobDescription);
    
    // Generate overall suggestions
    const overallSuggestions = generateOverallSuggestions(resumeText, jobDescription);
    
    // Generate metrics for dashboard
    const metrics = generateMetrics(keywordMatchPercent, atsScore, resumeText, jobDescription);
    
    return {
      matchScore: keywordMatchPercent,
      atsScore,
      matchedKeywords,
      missingKeywords,
      sectionRecommendations,
      overallSuggestions,
      metrics,
      aiAnalysis: {
        resume: resumeAnalysis,
        jobMatch: jobMatchAnalysis
      }
    };
  } catch (error) {
    console.error('Error analyzing resume:', error);
    throw new Error('Failed to analyze resume');
  }
};

/**
 * Calculate ATS score based on resume format and content
 * @param {string} resumeText - The resume text
 * @param {string} jobDescription - Optional job description
 * @param {number} matchedKeywordsCount - Number of matched keywords, if available
 * @returns {number} ATS score 0-100
 */
export const calculateATSScore = (resumeText, jobDescription = '', matchedKeywordsCount = 0) => {
  let score = 0;
  const maxScore = 100;
  
  // Evaluate resume structure (20 points)
  const structureScore = evaluateResumeStructure(resumeText);
  
  // Evaluate content quality (30 points)
  const contentScore = evaluateContentQuality(resumeText);
  
  // Evaluate keyword optimization (30 points)
  const keywordScore = jobDescription 
    ? evaluateKeywordOptimization(resumeText, jobDescription, matchedKeywordsCount)
    : 15; // Neutral score if no job description
  
  // Evaluate formatting and readability (20 points)
  const formattingScore = evaluateFormatting(resumeText);
  
  // Calculate total score
  score = structureScore + contentScore + keywordScore + formattingScore;
  
  // Ensure score is within 0-100 range
  return Math.min(Math.max(Math.round(score), 0), maxScore);
};

/**
 * Generate general recommendations for resume improvement
 * @param {string} resumeText - The resume text
 * @returns {string[]} Array of recommendations
 */
export const generateRecommendations = (resumeText) => {
  const recommendations = [];
  
  // Check resume length
  const wordCount = resumeText.split(/\s+/).length;
  if (wordCount < 200) {
    recommendations.push('Your resume is quite short. Consider adding more details about your experience and skills.');
  } else if (wordCount > 1000) {
    recommendations.push('Your resume is quite long. Consider focusing on the most relevant information.');
  }
  
  // Check for common resume sections
  if (!resumeText.toLowerCase().includes('experience') && !resumeText.toLowerCase().includes('work history')) {
    recommendations.push('Consider adding a dedicated "Experience" or "Work History" section.');
  }
  
  if (!resumeText.toLowerCase().includes('education')) {
    recommendations.push('Consider adding an "Education" section to highlight your academic background.');
  }
  
  if (!resumeText.toLowerCase().includes('skills')) {
    recommendations.push('Consider adding a "Skills" section to highlight your technical and soft skills.');
  }
  
  // Check for action verbs
  const actionVerbs = ['managed', 'developed', 'created', 'designed', 'implemented', 'led', 'coordinated', 'achieved'];
  const actionVerbCount = actionVerbs.reduce((count, verb) => {
    return count + (resumeText.toLowerCase().match(new RegExp(`\\b${verb}\\b`, 'g')) || []).length;
  }, 0);
  
  if (actionVerbCount < 5) {
    recommendations.push('Use more action verbs (like "developed," "managed," "created") to describe your accomplishments.');
  }
  
  // Add general recommendations
  recommendations.push('Quantify your achievements with numbers and percentages where possible.');
  recommendations.push('Ensure your contact information is up-to-date and professional.');
  
  return recommendations;
};

/* Helper functions for resume analysis */

/**
 * Extract keywords from text
 * @param {string} text - The text to extract keywords from
 * @returns {string[]} Array of keywords
 */
const extractKeywords = (text) => {
  if (!text) return [];
  
  // Convert to lowercase and remove special characters
  const cleanedText = text.toLowerCase().replace(/[^\w\s]/g, '');
  
  // Split into words
  const words = cleanedText.split(/\s+/);
  
  // Filter out common stop words
  const stopWords = [
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with',
    'by', 'about', 'as', 'of', 'is', 'was', 'be', 'been', 'being', 'that', 'this',
    'these', 'those', 'it', 'its', 'we', 'they', 'them', 'their', 'our', 'your',
    'my', 'will', 'shall', 'would', 'should', 'can', 'could', 'may', 'might',
    'must', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing'
  ];
  
  return words.filter(word => 
    word.length > 2 && !stopWords.includes(word)
  );
};

/**
 * Find matching keywords between job and resume
 * @param {string[]} jobKeywords - Keywords from job description
 * @param {string[]} resumeKeywords - Keywords from resume
 * @param {string} jobDescription - Original job description text
 * @returns {Object[]} Array of matched keywords with metadata
 */
const findMatchingKeywords = (jobKeywords, resumeKeywords, jobDescription) => {
  return jobKeywords
    .filter(keyword => resumeKeywords.includes(keyword))
    .map(text => {
      // Determine importance based on frequency in job description
      const count = jobDescription.toLowerCase().split(text).length - 1;
      let importance = 'low';
      if (count >= 5) importance = 'high';
      else if (count >= 2) importance = 'medium';
      
      // Determine category
      const category = determineKeywordCategory(text);
      
      return { text, importance, category };
    });
};

/**
 * Find missing keywords between job and resume
 * @param {string[]} jobKeywords - Keywords from job description
 * @param {string[]} resumeKeywords - Keywords from resume
 * @param {string} jobDescription - Original job description text
 * @returns {Object[]} Array of missing keywords with metadata
 */
const findMissingKeywords = (jobKeywords, resumeKeywords, jobDescription) => {
  return jobKeywords
    .filter(keyword => !resumeKeywords.includes(keyword))
    .map(text => {
      // Determine importance based on frequency in job description
      const count = jobDescription.toLowerCase().split(text).length - 1;
      let importance = 'low';
      if (count >= 5) importance = 'high';
      else if (count >= 2) importance = 'medium';
      
      // Determine category
      const category = determineKeywordCategory(text);
      
      return { text, importance, category };
    });
};

/**
 * Determine keyword category
 * @param {string} keyword - Keyword to categorize
 * @returns {string} Category name
 */
const determineKeywordCategory = (keyword) => {
  const categories = {
    'Technical Skills': [
      'javascript', 'python', 'java', 'cpp', 'ruby', 'php', 'swift', 'golang',
      'react', 'angular', 'vue', 'node', 'express', 'django', 'flask', 'spring',
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins',
      'sql', 'mongodb', 'postgresql', 'mysql', 'firebase', 'elasticsearch',
      'git', 'github', 'rest', 'graphql', 'api', 'frontend', 'backend', 'fullstack',
      'devops', 'cicd', 'testing', 'automation', 'algorithms', 'data structures'
    ],
    'Soft Skills': [
      'communication', 'teamwork', 'collaboration', 'leadership', 'management',
      'problem solving', 'critical thinking', 'creativity', 'adaptability',
      'organization', 'time management', 'flexibility', 'interpersonal',
      'presentation', 'negotiation', 'conflict resolution', 'customer service',
      'mentoring', 'facilitation', 'delegation', 'strategic', 'planning'
    ],
    'Tools & Technologies': [
      'jira', 'trello', 'slack', 'asana', 'confluence', 'notion', 'microsoft',
      'photoshop', 'illustrator', 'figma', 'sketch', 'indesign', 'adobe',
      'tableau', 'power bi', 'excel', 'spss', 'r', 'sas', 'matlab', 'jupyter',
      'webpack', 'babel', 'npm', 'yarn', 'chrome', 'firefox', 'safari',
      'android', 'ios', 'mobile', 'responsive', 'wordpress', 'shopify'
    ],
    'Industry Knowledge': [
      'finance', 'healthcare', 'education', 'manufacturing', 'retail', 'logistics',
      'ecommerce', 'saas', 'marketing', 'sales', 'legal', 'compliance', 'hr',
      'operations', 'business', 'consulting', 'strategy', 'analytics'
    ]
  };

  for (const [category, categoryKeywords] of Object.entries(categories)) {
    if (categoryKeywords.some(ck => keyword.includes(ck) || ck.includes(keyword))) {
      return category;
    }
  }
  
  return 'Other';
};

/**
 * Calculate keyword match percentage
 * @param {number} matchedCount - Number of matched keywords
 * @param {number} missingCount - Number of missing keywords
 * @returns {number} Match percentage
 */
const calculateKeywordMatchPercentage = (matchedCount, missingCount) => {
  return matchedCount > 0
    ? Math.round((matchedCount / (matchedCount + missingCount)) * 100)
    : 0;
};

/**
 * Evaluate resume structure
 * @param {string} resumeText - The resume text
 * @returns {number} Structure score (0-20)
 */
const evaluateResumeStructure = (resumeText) => {
  let score = 0;
  const maxScore = 20;
  
  // Check for common resume sections
  const sectionHeaders = ['summary', 'objective', 'experience', 'education', 'skills', 'projects'];
  
  sectionHeaders.forEach(section => {
    if (resumeText.toLowerCase().includes(section)) {
      score += 3;
    }
  });
  
  // Cap at maximum score
  return Math.min(score, maxScore);
};

/**
 * Evaluate content quality
 * @param {string} resumeText - The resume text
 * @returns {number} Content score (0-30)
 */
const evaluateContentQuality = (resumeText) => {
  let score = 15; // Start with neutral score
  const maxScore = 30;
  
  // Check for quantifiable achievements
  const numbersCount = (resumeText.match(/\d+%|\d+/g) || []).length;
  if (numbersCount > 10) score += 5;
  else if (numbersCount > 5) score += 3;
  
  // Check for action verbs
  const actionVerbs = ['managed', 'developed', 'created', 'designed', 'implemented', 'led', 'coordinated', 'achieved'];
  const actionVerbCount = actionVerbs.reduce((count, verb) => {
    return count + (resumeText.toLowerCase().match(new RegExp(`\\b${verb}\\b`, 'g')) || []).length;
  }, 0);
  
  if (actionVerbCount > 15) score += 5;
  else if (actionVerbCount > 8) score += 3;
  
  // Check length (not too short, not too long)
  const wordCount = resumeText.split(/\s+/).length;
  if (wordCount > 300 && wordCount < 800) score += 5;
  else if (wordCount > 200 && wordCount < 1000) score += 3;
  
  // Cap at maximum score
  return Math.min(score, maxScore);
};

/**
 * Evaluate keyword optimization
 * @param {string} resumeText - The resume text
 * @param {string} jobDescription - The job description
 * @param {number} matchedKeywordsCount - Number of matched keywords
 * @returns {number} Keyword score (0-30)
 */
const evaluateKeywordOptimization = (resumeText, jobDescription, matchedKeywordsCount) => {
  const maxScore = 30;
  
  // Extract keywords from job description
  const jobKeywords = extractKeywords(jobDescription);
  
  // Calculate match percentage
  const matchPercentage = matchedKeywordsCount / jobKeywords.length;
  
  // Score based on percentage
  let score = Math.round(matchPercentage * maxScore);
  
  // Cap at maximum score
  return Math.min(score, maxScore);
};

/**
 * Evaluate formatting and readability
 * @param {string} resumeText - The resume text
 * @returns {number} Formatting score (0-20)
 */
const evaluateFormatting = (resumeText) => {
  let score = 10; // Start with neutral score
  const maxScore = 20;
  
  // Check for consistent spacing
  const inconsistentSpacing = resumeText.match(/\n{3,}/g);
  if (!inconsistentSpacing) score += 5;
  
  // Check for bullet points
  const bulletPoints = resumeText.match(/•|-|\*/g);
  if (bulletPoints && bulletPoints.length > 5) score += 5;
  
  // Check for consistent capitalization in section headers
  // This is a simplification since we can't easily detect section headers
  const potentialHeaders = resumeText.match(/^[A-Z][A-Z\s]+$/gm);
  if (potentialHeaders && potentialHeaders.length > 3) score += 5;
  
  // Cap at maximum score
  return Math.min(score, maxScore);
};

/**
 * Generate section-specific recommendations
 * @param {string} resumeText - The resume text
 * @param {string} jobDescription - The job description
 * @returns {Object} Section recommendations
 */
const generateSectionRecommendations = (resumeText, jobDescription) => {
  return {
    summary: "Consider tailoring your summary to highlight skills specifically mentioned in the job description. Keep it concise and impactful.",
    experience: "Focus on achievements rather than responsibilities. Quantify your impact with metrics where possible.",
    skills: "Ensure your skills section includes the key technical skills mentioned in the job description. Organize them by category for better readability.",
    education: "List your most recent education first. Include relevant coursework or projects if you're a recent graduate."
  };
};

/**
 * Generate overall suggestions
 * @param {string} resumeText - The resume text
 * @param {string} jobDescription - The job description
 * @returns {string[]} Overall suggestions
 */
const generateOverallSuggestions = (resumeText, jobDescription) => {
  return [
    "Tailor your resume specifically to this job description by highlighting relevant experience and skills.",
    "Use industry-specific terminology and keywords found in the job listing.",
    "Ensure your achievements are quantified with numbers when possible (e.g., 'increased sales by 20%').",
    "Keep formatting consistent and easy to scan for an ATS system.",
    "Consider adding a brief professional summary that aligns with the job requirements."
  ];
};

/**
 * Generate metrics for dashboard
 * @param {number} keywordMatchPercent - Keyword match percentage
 * @param {number} atsScore - ATS score
 * @param {string} resumeText - The resume text
 * @param {string} jobDescription - The job description
 * @returns {Object[]} Metrics array
 */
const generateMetrics = (keywordMatchPercent, atsScore, resumeText, jobDescription) => {
  return [
    {
      name: 'Keyword Match Rate',
      value: `${keywordMatchPercent}%`,
      description: 'Percentage of job keywords found in your resume'
    },
    {
      name: 'ATS Compatibility',
      value: `${atsScore}%`,
      description: 'How well your resume will perform in Applicant Tracking Systems'
    },
    {
      name: 'Content Quality',
      value: `${evaluateContentQuality(resumeText) / 0.3}%`,
      description: 'Assessment of your resume\'s content effectiveness'
    },
    {
      name: 'Formatting Score',
      value: `${evaluateFormatting(resumeText) / 0.2}%`,
      description: 'How well your resume is structured and formatted'
    }
  ];
}; 