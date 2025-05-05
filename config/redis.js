import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient = null;

export const getRedisClient = () => {
  // Return mock client if Redis is not configured
  if (!process.env.REDIS_URL) {
    return createMockRedisClient();
  }
  
  if (!redisClient) {
    try {
      redisClient = createClient({
        url: process.env.REDIS_URL
      });
      
      redisClient.on('error', (err) => {
        console.error('Redis client error:', err);
        redisClient = createMockRedisClient();
      });
      
      if (!redisClient.isOpen) {
        redisClient.connect().catch(err => {
          console.error('Redis connection error:', err);
          redisClient = createMockRedisClient();
        });
      }
    } catch (error) {
      console.error('Redis initialization error:', error);
      redisClient = createMockRedisClient();
    }
  }
  
  return redisClient;
};

// Mock Redis client for local development without Redis
const createMockRedisClient = () => {
  const storage = new Map();
  
  return {
    isOpen: true,
    isReady: true,
    
    // Mock methods
    set: async (key, value, options) => {
      const expiry = options?.EX ? Date.now() + (options.EX * 1000) : null;
      storage.set(key, { value, expiry });
      return 'OK';
    },
    
    get: async (key) => {
      const item = storage.get(key);
      if (!item) return null;
      
      if (item.expiry && Date.now() > item.expiry) {
        storage.delete(key);
        return null;
      }
      
      return item.value;
    },
    
    del: async (key) => {
      return storage.delete(key) ? 1 : 0;
    },
    
    // More methods can be mocked as needed
  };
}; 