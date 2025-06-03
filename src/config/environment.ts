import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  NODE_ENV: string;
  PORT: number;
  LOG_LEVEL: string;
  
  // Telegram
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  
  // API Keys
  BINANCE_API_KEY: string;
  BINANCE_SECRET_KEY: string;
  CAPITAL_COM_API_KEY: string;
  CAPITAL_COM_CUSTOM_PASS: string;
  CAPITAL_COM_IDENTIFIER: string;
  COINMARKETCAP_API_KEY: string;
  
  // Cache
  CACHE_TTL: number;
  MAX_CACHE_SIZE: number;
  
  // Performance
  MAX_SIGNAL_PROCESSING_LATENCY: number;
  BACKGROUND_TASK_INTERVAL: number;
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value || defaultValue!;
};

const getEnvNumber = (key: string, defaultValue?: number): number => {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required`);
  }
  const parsed = parseInt(value || defaultValue!.toString(), 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
  return parsed;
};

export const config: Config = {
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  PORT: getEnvNumber('PORT', 3000),
  LOG_LEVEL: getEnvVar('LOG_LEVEL', 'info'),

  // Telegram
  TELEGRAM_BOT_TOKEN: getEnvVar('TELEGRAM_BOT_TOKEN'),
  TELEGRAM_CHAT_ID: getEnvVar('TELEGRAM_CHAT_ID'),

  // API Keys
  BINANCE_API_KEY: getEnvVar('BINANCE_API_KEY'),
  BINANCE_SECRET_KEY: getEnvVar('BINANCE_SECRET_KEY'),
  CAPITAL_COM_API_KEY: getEnvVar('CAPITAL_COM_API_KEY'),
  CAPITAL_COM_CUSTOM_PASS: getEnvVar('CAPITAL_COM_CUSTOM_PASS'),
  CAPITAL_COM_IDENTIFIER: getEnvVar('CAPITAL_COM_IDENTIFIER'),
  COINMARKETCAP_API_KEY: getEnvVar('COINMARKETCAP_API_KEY'),

  // Cache
  CACHE_TTL: getEnvNumber('CACHE_TTL', 300000), // 5 minutes default
  MAX_CACHE_SIZE: getEnvNumber('MAX_CACHE_SIZE', 1000),

  // Performance
  MAX_SIGNAL_PROCESSING_LATENCY: getEnvNumber('MAX_SIGNAL_PROCESSING_LATENCY', 5000),
  BACKGROUND_TASK_INTERVAL: getEnvNumber('BACKGROUND_TASK_INTERVAL', 60000),
};
