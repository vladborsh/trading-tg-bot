/**
 * Date and session helper functions
 * Pure functions for date manipulation and session validation
 */
import { SessionSpec } from '../core/indicators/indicator.interfaces';

/**
 * Validate session specification
 */
export function validateSessionSpec(session: SessionSpec): boolean {
  if (session.startHour < 0 || session.startHour > 23) {
    return false;
  }

  if (session.endHour < 0 || session.endHour > 23) {
    return false;
  }

  if (session.startMinute && (session.startMinute < 0 || session.startMinute > 59)) {
    return false;
  }

  if (session.endMinute && (session.endMinute < 0 || session.endMinute > 59)) {
    return false;
  }

  return true;
}

/**
 * Convert date to specific timezone
 * This is a simplified timezone conversion
 * In production, consider using a library like date-fns-tz or moment-timezone
 */
export function convertToTimezone(date: Date, timezone: string): Date {
  const offsetMap: Record<string, number> = {
    'UTC': 0,
    'America/New_York': -5, // EST (adjust for DST in production)
    'Europe/London': 0, // GMT (adjust for DST in production)
    'Asia/Tokyo': 9, // JST
  };
  
  const offset = offsetMap[timezone] || 0;
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  return new Date(utc + (offset * 3600000));
}

/**
 * Check if a date/time falls within a session period
 */
export function isWithinSession(date: Date, session: SessionSpec, timezone?: string): boolean {
  const sessionTimezone = session.timezone || timezone || 'America/New_York';
  const sessionTime = convertToTimezone(date, sessionTimezone);
  
  const hour = sessionTime.getHours();
  const minute = sessionTime.getMinutes();
  
  const startHour = session.startHour;
  const startMinute = session.startMinute || 0;
  const endHour = session.endHour;
  const endMinute = session.endMinute || 0;
  
  const currentMinutes = hour * 60 + minute;
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  
  // Handle sessions that cross midnight
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  } else {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }
}

/**
 * Get the most recent N periods from an array of klines
 */
export function getRecentKlines<T extends { openTime: Date }>(klines: T[], count: number): T[] {
  if (klines.length <= count) {
    return [...klines];
  }
  
  return klines.slice(-count);
}

/**
 * Check if period specification is a session specification
 */
export function isSessionSpec(period: any): period is SessionSpec {
  return typeof period === 'object' && 
         period !== null && 
         'type' in period && 
         period.type === 'time_session';
}
