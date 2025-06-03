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
 * Cache constants
 */
export const CACHE_CONSTANTS = {
  DEFAULT_TTL: 60 * 1000, // 1 minute
  MIN_TTL: 1000, // 1 second
  MAX_TTL: 24 * 60 * 60 * 1000, // 24 hours
  CLEANUP_INTERVAL: 30 * 1000, // 30 seconds
} as const;
