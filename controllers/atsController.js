import { OpenAI } from 'openai';
import natural from 'natural';
import Analysis from '../models/Analysis.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;

export const analyzeResume = async (req, res) => {
  const { resumeContent, jobDescription } = req.body;
  const userId = req.user.id;

  try {
    // Extract keywords from job description using TF-IDF
    const tfidf = new TfIdf();
    tfidf.addDocument(jobDescription);
    const jobKeywords = [];
    tfidf.listTerms(0).slice(0, 20).forEach(item => {
      jobKeywords.push(item.term);
    });

    // Use GPT-4 for semantic analysis
    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert ATS (Applicant Tracking System) analyzer. Analyze the resume against the job description and provide detailed feedback."
        },
        {
          role: "user",
          content: `Please analyze this resume against the job description. 
          Resume: ${resumeContent}
          Job Description: ${jobDescription}
          
          Provide the following:
          1. A match score (0-100)
          2. List of missing important keywords
          3. Specific recommendations for improvement
          Format the response as JSON with keys: score, missingKeywords, recommendations`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const analysis = JSON.parse(gptResponse.choices[0].message.content);

    // Save analysis to database
    const newAnalysis = new Analysis({
      userId,
      resumeContent,
      jobDescription,
      score: analysis.score,
      missingKeywords: analysis.missingKeywords,
      recommendations: analysis.recommendations,
      jobKeywords
    });

    await newAnalysis.save();

    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing resume:', error);
    res.status(500).json({ error: 'Error analyzing resume' });
  }
};

export const getAnalysisHistory = async (req, res) => {
  const userId = req.user.id;

  try {
    const history = await Analysis.find({ userId })
      .sort({ createdAt: -1 })
      .select('-resumeContent -jobDescription');

    res.json(history);
  } catch (error) {
    console.error('Error fetching analysis history:', error);
    res.status(500).json({ error: 'Error fetching analysis history' });
  }
};

export const saveAnalysis = async (req, res) => {
  const userId = req.user.id;
  const analysisData = req.body;

  try {
    const analysis = new Analysis({
      userId,
      ...analysisData
    });

    await analysis.save();
    res.json(analysis);
  } catch (error) {
    console.error('Error saving analysis:', error);
    res.status(500).json({ error: 'Error saving analysis' });
  }
}; 