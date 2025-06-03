import { TIME_CONSTANTS, MARKET_TIME_INTERVALS } from '../config/constants';

/**
 * Converts a market time interval string to milliseconds
 */
export function getIntervalMs(interval: string): number {
  const intervals: Record<string, number> = {
    [MARKET_TIME_INTERVALS.ONE_MINUTE]: TIME_CONSTANTS.MINUTE,
    [MARKET_TIME_INTERVALS.THREE_MINUTES]: 3 * TIME_CONSTANTS.MINUTE,
    [MARKET_TIME_INTERVALS.FIVE_MINUTES]: 5 * TIME_CONSTANTS.MINUTE,
    [MARKET_TIME_INTERVALS.FIFTEEN_MINUTES]: 15 * TIME_CONSTANTS.MINUTE,
    [MARKET_TIME_INTERVALS.THIRTY_MINUTES]: 30 * TIME_CONSTANTS.MINUTE,
    [MARKET_TIME_INTERVALS.ONE_HOUR]: TIME_CONSTANTS.HOUR,
    [MARKET_TIME_INTERVALS.TWO_HOURS]: 2 * TIME_CONSTANTS.HOUR,
    [MARKET_TIME_INTERVALS.FOUR_HOURS]: 4 * TIME_CONSTANTS.HOUR,
    [MARKET_TIME_INTERVALS.SIX_HOURS]: 6 * TIME_CONSTANTS.HOUR,
    [MARKET_TIME_INTERVALS.EIGHT_HOURS]: 8 * TIME_CONSTANTS.HOUR,
    [MARKET_TIME_INTERVALS.TWELVE_HOURS]: 12 * TIME_CONSTANTS.HOUR,
    [MARKET_TIME_INTERVALS.ONE_DAY]: TIME_CONSTANTS.DAY,
    [MARKET_TIME_INTERVALS.THREE_DAYS]: 3 * TIME_CONSTANTS.DAY,
    [MARKET_TIME_INTERVALS.ONE_WEEK]: TIME_CONSTANTS.WEEK,
    [MARKET_TIME_INTERVALS.ONE_MONTH]: TIME_CONSTANTS.MONTH,
  };
  
  return intervals[interval] || TIME_CONSTANTS.MINUTE; // Default to 1 minute
}

/**
 * Returns an array of valid market time intervals
 */
export function getValidIntervals(): string[] {
  return Object.values(MARKET_TIME_INTERVALS);
}

/**
 * Check if a given interval string is valid
 */
export function isValidInterval(interval: string): boolean {
  return getValidIntervals().includes(interval);
}

/**
 * Converts milliseconds to a human-readable duration string
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / TIME_CONSTANTS.SECOND);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d${hours % 24}h`;
  if (hours > 0) return `${hours}h${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Get the timestamp for the start of a given interval
 */
export function getIntervalStartTime(timestamp: Date | number, interval: string): Date {
  const date = new Date(timestamp);
  const ms = getIntervalMs(interval);

  // Round down to the nearest interval
  const unixTime = Math.floor(date.getTime() / ms) * ms;
  return new Date(unixTime);
}

/**
 * Get the timestamp for the end of a given interval
 */
export function getIntervalEndTime(timestamp: Date | number, interval: string): Date {
  const startTime = getIntervalStartTime(timestamp, interval);
  const ms = getIntervalMs(interval);
  return new Date(startTime.getTime() + ms - 1);
}

/**
 * Delay execution for a specified number of milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
