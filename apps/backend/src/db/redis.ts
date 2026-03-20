import { createClient } from 'redis';
import { config } from '../config';

const redisClient = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port,
    reconnectStrategy: (retries) => {
      if (retries > 3) {
        console.warn('Redis reconnection attempts exceeded, giving up');
        return new Error('Redis connection failed');
      }
      return Math.min(retries * 100, 3000);
    },
  },
  password: config.redis.password,
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err.message);
});

redisClient.on('connect', () => {
  console.log('Redis Client Connected');
});

redisClient.on('ready', () => {
  console.log('Redis Client Ready');
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    return true;
  } catch (error: any) {
    console.error('Failed to connect to Redis:', error.message);
    return false;
  }
};

export const isRedisConnected = () => {
  return redisClient.isOpen;
};

export default redisClient;
