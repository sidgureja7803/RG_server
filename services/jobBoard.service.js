import axios from 'axios';
import { getRedisClient } from '../config/redis.js';

const redis = getRedisClient();

// Cache duration in seconds
const CACHE_DURATION = 3600; // 1 hour

export const searchJobs = async (query, location = '') => {
  const cacheKey = `jobs:${query}:${location}`;
  
  // Try to get cached results
  const cachedResults = await redis.get(cacheKey);
  if (cachedResults) {
    return JSON.parse(cachedResults);
  }

  try {
    const results = await Promise.all([
      searchIndeedJobs(query, location),
      searchLinkedInJobs(query, location),
      searchGlassdoorJobs(query, location)
    ]);

    const combinedResults = {
      indeed: results[0],
      linkedin: results[1],
      glassdoor: results[2]
    };

    // Cache the results
    await redis.setEx(cacheKey, CACHE_DURATION, JSON.stringify(combinedResults));

    return combinedResults;
  } catch (error) {
    console.error('Error fetching jobs:', error);
    throw new Error('Failed to fetch job listings');
  }
};

const searchIndeedJobs = async (query, location) => {
  try {
    // Replace with actual Indeed API integration
    const response = await axios.get(`https://api.indeed.com/v2/jobs/search`, {
      params: {
        q: query,
        l: location,
        // Add your Indeed API key and other parameters
      },
      headers: {
        'Authorization': `Bearer ${process.env.INDEED_API_KEY}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Indeed API Error:', error);
    return [];
  }
};

const searchLinkedInJobs = async (query, location) => {
  try {
    // Replace with actual LinkedIn API integration
    const response = await axios.get(`https://api.linkedin.com/v2/jobs/search`, {
      params: {
        keywords: query,
        location: location,
        // Add your LinkedIn API parameters
      },
      headers: {
        'Authorization': `Bearer ${process.env.LINKEDIN_API_KEY}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('LinkedIn API Error:', error);
    return [];
  }
};

const searchGlassdoorJobs = async (query, location) => {
  try {
    // Replace with actual Glassdoor API integration
    const response = await axios.get(`https://api.glassdoor.com/v1/jobs/search`, {
      params: {
        q: query,
        l: location,
        // Add your Glassdoor API parameters
      },
      headers: {
        'Authorization': `Bearer ${process.env.GLASSDOOR_API_KEY}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Glassdoor API Error:', error);
    return [];
  }
};

// Fallback method when API keys are not available
export const searchJobsMock = async (query, location = '') => {
  return {
    jobs: [
      {
        id: 1,
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        description: 'Looking for a skilled software engineer...',
        salary: '$120,000 - $150,000',
        url: 'https://example.com/job1',
        source: 'Indeed'
      },
      {
        id: 2,
        title: 'Full Stack Developer',
        company: 'Startup Inc',
        location: 'Remote',
        description: 'Join our fast-growing team...',
        salary: '$100,000 - $130,000',
        url: 'https://example.com/job2',
        source: 'LinkedIn'
      },
      // Add more mock jobs...
    ],
    total: 2,
    page: 1,
    pages: 1
  };
};

export default {
  searchJobs,
  searchJobsMock
}; 