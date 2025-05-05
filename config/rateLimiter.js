import rateLimit from 'express-rate-limit';
import { getRedisClient } from './redis.js';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = getRedisClient();

export const createRateLimiter = () => {
  return new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'middleware',
    points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    duration: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 15,
    blockDuration: 60 * 15, // 15 minutes
  });
};

export const rateLimiterMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too Many Requests',
    message: 'Please try again later'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
}); 