import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize providers only when needed
const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is missing');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
};

const getGeminiClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Gemini API key is missing');
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: "gemini-pro" });
};

export const analyzeWithAI = async (text, type = 'resume', provider = 'gemini') => {
  try {
    let prompt;
    
    switch (type) {
      case 'resume':
        prompt = `Analyze this resume and provide detailed feedback:
1. Overall Structure and Format
2. Content Quality
3. Skills Assessment
4. Experience Description Quality
5. Areas for Improvement
6. ATS Optimization Suggestions

Resume Text:
${text}`;
        break;
        
      case 'job-match':
        prompt = `Analyze how well this resume matches the job description and provide detailed feedback:
1. Overall Match Score (0-100)
2. Key Skills Match
3. Experience Relevance
4. Missing Keywords/Skills
5. Suggested Improvements
6. Competitive Advantages

Resume Text:
${text}`;
        break;
        
      case 'extract-keywords':
        prompt = text; // The prompt is already formatted in the controller
        break;
        
      default:
        prompt = text;
    }

    if (provider === 'openai') {
      const openai = getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert resume analyzer and career coach. Provide detailed, actionable feedback."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });
      return response.choices[0].message.content;
    } else {
      const geminiModel = getGeminiClient();
      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;
      return response.text();
    }
  } catch (error) {
    console.error('AI analysis error:', error);
    throw new Error('Failed to analyze with AI');
  }
};

export default {
  geminiApiKey: process.env.GEMINI_API_KEY
}; 