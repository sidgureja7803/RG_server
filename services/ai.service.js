import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const analyzeResume = async (resumeContent, jobDescription = null) => {
  try {
    const prompt = jobDescription
      ? `Analyze this resume content and provide suggestions to optimize it for the following job description:
         Resume: ${resumeContent}
         Job Description: ${jobDescription}`
      : `Analyze this resume content and provide general suggestions for improvement:
         ${resumeContent}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert resume analyst and career advisor. Analyze resumes and provide specific, actionable suggestions for improvement."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return {
      suggestions: response.choices[0].message.content,
      score: calculateATSScore(resumeContent, jobDescription)
    };
  } catch (error) {
    console.error('Error analyzing resume:', error);
    throw new Error('Failed to analyze resume');
  }
};

export const findRelevantJobs = async (resumeContent) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a job matching expert. Extract key skills and experience from resumes and suggest relevant job titles and industries."
        },
        {
          role: "user",
          content: `Based on this resume content, suggest relevant job titles and industries:
                   ${resumeContent}`
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    const suggestions = response.choices[0].message.content;
    return await fetchJobListings(suggestions);
  } catch (error) {
    console.error('Error finding relevant jobs:', error);
    throw new Error('Failed to find relevant jobs');
  }
};

const calculateATSScore = (resumeContent, jobDescription) => {
  // Implement ATS scoring logic
  // This is a simplified version - you would want to make this more sophisticated
  const score = {
    total: 0,
    categories: {
      keywords: 0,
      formatting: 0,
      completeness: 0,
      relevance: 0
    }
  };

  // Check for keywords if job description is provided
  if (jobDescription) {
    const keywords = extractKeywords(jobDescription);
    const keywordMatches = keywords.filter(keyword => 
      resumeContent.toLowerCase().includes(keyword.toLowerCase())
    );
    score.categories.keywords = (keywordMatches.length / keywords.length) * 100;
  }

  // Check formatting
  score.categories.formatting = checkFormatting(resumeContent);

  // Check completeness
  score.categories.completeness = checkCompleteness(resumeContent);

  // Calculate relevance if job description is provided
  if (jobDescription) {
    score.categories.relevance = calculateRelevance(resumeContent, jobDescription);
  }

  // Calculate total score
  score.total = Object.values(score.categories).reduce((a, b) => a + b, 0) / 
                Object.keys(score.categories).length;

  return score;
};

const extractKeywords = (jobDescription) => {
  // Implement keyword extraction logic
  // This would be more sophisticated in production
  return jobDescription.split(/\s+/)
    .filter(word => word.length > 3)
    .map(word => word.toLowerCase());
};

const checkFormatting = (content) => {
  let score = 100;

  // Check for common formatting issues
  if (content.includes('  ')) score -= 10; // Double spaces
  if (content.includes('\t')) score -= 10; // Tabs
  if (content.match(/[A-Z]{5,}/)) score -= 10; // All caps
  if (content.match(/[^\S\r\n]{2,}/)) score -= 10; // Multiple spaces

  return Math.max(0, score);
};

const checkCompleteness = (content) => {
  let score = 0;
  const sections = [
    'experience',
    'education',
    'skills',
    'contact',
    'summary'
  ];

  sections.forEach(section => {
    if (content.toLowerCase().includes(section)) {
      score += 20;
    }
  });

  return Math.min(100, score);
};

const calculateRelevance = (resume, jobDescription) => {
  // Implement relevance calculation logic
  // This would be more sophisticated in production
  const resumeWords = new Set(resume.toLowerCase().split(/\s+/));
  const jobWords = new Set(jobDescription.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...resumeWords].filter(x => jobWords.has(x)));
  return (intersection.size / jobWords.size) * 100;
};

const fetchJobListings = async (suggestions) => {
  // Implement job fetching logic from various APIs
  // This is a placeholder - you would integrate with real job board APIs
  return {
    message: 'Based on your resume, here are some suggested job titles and industries:',
    suggestions: suggestions,
    // In production, you would fetch real job listings from APIs like:
    // - LinkedIn API
    // - Indeed API
    // - Glassdoor API
    sampleJobs: [
      {
        title: 'Sample Job 1',
        company: 'Company A',
        location: 'Remote',
        description: 'Sample job description...',
        url: 'https://example.com/job1'
      },
      // Add more sample jobs...
    ]
  };
};

export default {
  analyzeResume,
  findRelevantJobs
}; 