// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.TELEGRAM_BOT_TOKEN = 'test-token';
process.env.TELEGRAM_CHAT_ID = 'test-chat';
process.env.PORT = '3000';
process.env.CACHE_TTL = '300000';
process.env.MAX_CACHE_SIZE = '1000';
process.env.MAX_SIGNAL_PROCESSING_LATENCY = '5000';
process.env.BACKGROUND_TASK_INTERVAL = '60000';
process.env.CAPITAL_COM_API_KEY = 'test-api-key';
process.env.CAPITAL_COM_CUSTOM_PASS = 'test-custom-pass';
process.env.CAPITAL_COM_IDENTIFIER = 'test-identifier';

// Import reflect-metadata for dependency injection
require('reflect-metadata');
