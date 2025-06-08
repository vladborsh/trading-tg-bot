/**
 * Time constants in milliseconds
 */
export const TIME_CONSTANTS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,

  // Common intervals
  DEFAULT_CACHE_TTL: 60 * 1000, // 1 minute
  DEFAULT_CLEANUP_INTERVAL: 30 * 1000, // 30 seconds
  DEFAULT_RETRY_DELAY: 1000, // 1 second
  DEFAULT_REQUEST_TIMEOUT: 30 * 1000, // 30 seconds
} as const;

/**
 * Time intervals for market data
 */
export const MARKET_TIME_INTERVALS = {
  ONE_MINUTE: '1m',
  THREE_MINUTES: '3m',
  FIVE_MINUTES: '5m',
  FIFTEEN_MINUTES: '15m',
  THIRTY_MINUTES: '30m',
  ONE_HOUR: '1h',
  TWO_HOURS: '2h',
  FOUR_HOURS: '4h',
  SIX_HOURS: '6h',
  EIGHT_HOURS: '8h',
  TWELVE_HOURS: '12h',
  ONE_DAY: '1d',
  THREE_DAYS: '3d',
  ONE_WEEK: '1w',
  ONE_MONTH: '1M',
} as const;

/**
 * Rate limiting constants
 */
export const RATE_LIMIT_CONSTANTS = {
  DEFAULT_REQUESTS_PER_MINUTE: 1200,
  DEFAULT_INTERVAL: 60 * 1000, // 1 minute
  DEFAULT_RETRY_ATTEMPTS: 3,
  DEFAULT_BATCH_SIZE: 10,
  DEFAULT_BATCH_DELAY: 100, // 100ms between batches
  DEFAULT_WAIT_INTERVAL: 100, // 100ms polling interval
} as const;

/**
 * Trading session constants
 */
export const TRADING_CONSTANTS = {
  DEFAULT_TIMEZONE: 'America/New_York',
  LONDON_SESSION_START_HOUR: 3,
  LONDON_SESSION_END_HOUR: 8,
  US_SESSION_START_HOUR: 9,
  US_SESSION_START_MINUTE: 30,
  US_SESSION_END_HOUR: 16,
  US_SESSION_END_MINUTE: 0,
  ASIAN_SESSION_START_HOUR: 19,
  ASIAN_SESSION_END_HOUR: 2,
} as const;

/**
 * Strategy calculation constants
 */
export const STRATEGY_CONSTANTS = {
  DEFAULT_KLINES_LIMIT: 100,
  DEFAULT_MARKET_DATA_INTERVAL: '5m',
  CROSS_DETECTION_LOOKBACK_PERIODS: 10,
  BASE_CONFIDENCE_SCORE: 0.5,
  CONFIDENCE_INCREMENT_PER_ASSET: 0.1,
  MAX_DISTANCE_CONFIDENCE_BOOST: 0.3,
  DISTANCE_CONFIDENCE_MULTIPLIER: 2,
} as const;

/**
 * Cache constants
 */
export const CACHE_CONSTANTS = {
  DEFAULT_TTL: 60 * 1000, // 1 minute
  MIN_TTL: 1000, // 1 second
  MAX_TTL: 24 * 60 * 60 * 1000, // 24 hours
  CLEANUP_INTERVAL: 30 * 1000, // 30 seconds
} as const;

/**
 * Bot messaging and UI constants
 */
export const BOT_CONSTANTS = {
  MILLISECONDS_PER_MINUTE: 60 * 1000,
  PERCENTAGE_MULTIPLIER: 100,
  PRICE_DECIMAL_PLACES: 4,
  NY_TIMEZONE: 'America/New_York',
  NY_SESSION_START_HOUR: 8,
  NY_SESSION_END_HOUR: 12,

  // Strategy configuration
  DEFAULT_CANDLE_INTERVAL: MARKET_TIME_INTERVALS.FIVE_MINUTES,
  MIN_CORRELATED_ASSETS: 1,
  KLINES_LIMIT: 100,
  CROSS_DETECTION_LOOKBACK: 10,

  // Cron schedules
  HEALTH_CHECK_SCHEDULE: '*/5 * * * *',
  DAILY_REPORT_SCHEDULE: '0 9 * * *',
  CORRELATION_CHECK_SCHEDULE: '*/5 * * * 1-5',
} as const;
