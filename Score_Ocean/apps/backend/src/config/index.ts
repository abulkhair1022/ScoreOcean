import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'score_ocean',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
  },
  
  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  
  // JWT
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'access-secret-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  } as {
    accessSecret: string;
    refreshSecret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  },
  
  // Payment Gateway
  payment: {
    gatewayKey: process.env.PAYMENT_GATEWAY_KEY,
    gatewaySecret: process.env.PAYMENT_GATEWAY_SECRET,
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET,
    commissionRate: parseFloat(process.env.COMMISSION_RATE || '0.05'),
  },
  
  // Email
  email: {
    service: process.env.EMAIL_SERVICE,
    apiKey: process.env.EMAIL_API_KEY,
    from: process.env.EMAIL_FROM || 'noreply@scoreocean.com',
  },
  
  // SMS
  sms: {
    service: process.env.SMS_SERVICE,
    apiKey: process.env.SMS_API_KEY,
    from: process.env.SMS_FROM,
  },
};
