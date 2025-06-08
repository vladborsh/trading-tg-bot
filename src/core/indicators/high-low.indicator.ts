/**
 * High/Low Indicator implementation
 * Calculates highest and lowest prices for specified time periods
 */
import { 
  HighLowIndicatorInterface, 
  HighLowResult, 
  HighLowIndicatorConfig, 
  PeriodSpec,
  ExtendedMarketData,
  SessionSpec
} from './indicator.interfaces';
import { Kline } from '../../domain/interfaces/market-data.interfaces';
import { TIME_CONSTANTS, TRADING_CONSTANTS } from '../../config/constants';
import { isWithinSession } from '../../utils/date-helpers';

export class HighLowIndicator implements HighLowIndicatorInterface {
  getName(): string {
    return 'HighLowIndicator';
  }

  getRequiredDataPoints(): number {
    return 1; // At least one data point required
  }

  /**
   * Calculate high/low for the specified period
   */
  async calculate(data: Kline[], config: HighLowIndicatorConfig): Promise<HighLowResult> {
    if (!this.validate(data)) {
      throw new Error('Invalid data provided to HighLowIndicator');
    }

    const filteredData = this.filterDataByPeriod(data, config.period, config.timezone);
    
    if (filteredData.length === 0) {
      throw new Error(`No data available for period: ${JSON.stringify(config.period)}`);
    }

    const extendedData = this.enrichKlineData(filteredData);
    const result = this.calculateHighLow(extendedData, config);

    return result;
  }

  /**
   * Validate input data
   */
  validate(data: Kline[]): boolean {
    if (!Array.isArray(data) || data.length === 0) {
      return false;
    }

    return data.every(kline => 
      typeof kline.high === 'number' &&
      typeof kline.low === 'number' &&
      typeof kline.open === 'number' &&
      typeof kline.close === 'number' &&
      kline.high >= kline.low &&
      kline.openTime instanceof Date &&
      kline.closeTime instanceof Date
    );
  }

  /**
   * Filter data based on the specified period
   */
  private filterDataByPeriod(data: Kline[], period: PeriodSpec, timezone?: string): Kline[] {
    const now = new Date();
    const effectiveTimezone = timezone || TRADING_CONSTANTS.DEFAULT_TIMEZONE;
    
    switch (period) {
      case 'prev_day':
        return this.getPreviousDayData(data, now, effectiveTimezone);
      
      case 'prev_week':
        return this.getPreviousWeekData(data, now, effectiveTimezone);
      
      case 'prev_month':
        return this.getPreviousMonthData(data, now, effectiveTimezone);
      
      case 'current_day':
        return this.getCurrentDayData(data, now, effectiveTimezone);
      
      case 'current_week':
        return this.getCurrentWeekData(data, now, effectiveTimezone);
      
      case 'current_month':
        return this.getCurrentMonthData(data, now, effectiveTimezone);
      
      default:
        if (typeof period === 'string') {
          // Standard interval like '1h', '4h', '1d'
          return this.getStandardIntervalData(data, period);
        } else if (period.type === 'custom') {
          return this.getCustomPeriodData(data, period.startTime, period.endTime);
        } else if (period.type === 'rolling') {
          return this.getRollingPeriodData(data, period.periods, period.interval);
        } else if (period.type === 'time_session') {
          return this.getSessionPeriodData(data, period, effectiveTimezone);
        }
        
        throw new Error(`Unsupported period type: ${JSON.stringify(period)}`);
    }
  }

  /**
   * Get data for the previous complete day
   */
  private getPreviousDayData(data: Kline[], now: Date, timezone: string): Kline[] {
    const yesterdayStart = new Date(now);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);
    
    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setHours(23, 59, 59, 999);

    return data.filter(kline => 
      kline.openTime >= yesterdayStart && kline.closeTime <= yesterdayEnd
    );
  }

  /**
   * Get data for the previous complete week (Monday to Sunday)
   */
  private getPreviousWeekData(data: Kline[], now: Date, timezone: string): Kline[] {
    const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const mondayOffset = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    
    // Start of current week (Monday)
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(currentWeekStart.getDate() - mondayOffset);
    currentWeekStart.setHours(0, 0, 0, 0);
    
    // Start of previous week
    const prevWeekStart = new Date(currentWeekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    
    // End of previous week (Sunday)
    const prevWeekEnd = new Date(currentWeekStart);
    prevWeekEnd.setMilliseconds(-1);

    return data.filter(kline => 
      kline.openTime >= prevWeekStart && kline.closeTime <= prevWeekEnd
    );
  }

  /**
   * Get data for the previous complete month
   */
  private getPreviousMonthData(data: Kline[], now: Date, timezone: string): Kline[] {
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    return data.filter(kline => 
      kline.openTime >= prevMonthStart && kline.closeTime <= prevMonthEnd
    );
  }

  /**
   * Get data for the current day
   */
  private getCurrentDayData(data: Kline[], now: Date, timezone: string): Kline[] {
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    return data.filter(kline => kline.openTime >= todayStart);
  }

  /**
   * Get data for the current week
   */
  private getCurrentWeekData(data: Kline[], now: Date, timezone: string): Kline[] {
    const currentDayOfWeek = now.getDay();
    const mondayOffset = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    return data.filter(kline => kline.openTime >= weekStart);
  }

  /**
   * Get data for the current month
   */
  private getCurrentMonthData(data: Kline[], now: Date, timezone: string): Kline[] {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return data.filter(kline => kline.openTime >= monthStart);
  }

  /**
   * Get data for a standard interval (most recent N periods)
   */
  private getStandardIntervalData(data: Kline[], interval: string): Kline[] {
    // For standard intervals, we typically want the most recent data points
    // The number of periods to include can be configured
    const sortedData = [...data].sort((a, b) => b.openTime.getTime() - a.openTime.getTime());
    
    // Return last 100 periods by default, or all available data if less
    return sortedData.slice(0, Math.min(100, data.length)).reverse();
  }

  /**
   * Get data for a custom time period
   */
  private getCustomPeriodData(data: Kline[], startTime: Date, endTime: Date): Kline[] {
    return data.filter(kline => 
      kline.openTime >= startTime && kline.closeTime <= endTime
    );
  }

  /**
   * Get data for a rolling period (last N intervals)
   */
  private getRollingPeriodData(data: Kline[], periods: number, interval: string): Kline[] {
    const sortedData = [...data].sort((a, b) => b.openTime.getTime() - a.openTime.getTime());
    return sortedData.slice(0, periods).reverse();
  }

  /**
   * Get data for a specific time session (e.g., London session 3am-8am NY time)
   */
  private getSessionPeriodData(data: Kline[], session: SessionSpec, timezone?: string): Kline[] {
    return data.filter(kline => isWithinSession(kline.openTime, session, timezone));
  }

  /**
   * Enrich kline data with additional calculated fields
   */
  private enrichKlineData(data: Kline[]): ExtendedMarketData[] {
    return data.map(kline => ({
      ...kline,
      bodyHigh: Math.max(kline.open, kline.close),
      bodyLow: Math.min(kline.open, kline.close),
      upperWick: kline.high - Math.max(kline.open, kline.close),
      lowerWick: Math.min(kline.open, kline.close) - kline.low,
      isGreen: kline.close > kline.open
    }));
  }

  /**
   * Calculate high/low values from enriched data
   */
  private calculateHighLow(data: ExtendedMarketData[], config: HighLowIndicatorConfig): HighLowResult {
    const { useBodyHighLow = false } = config;
    
    let highest = -Infinity;
    let lowest = Infinity;
    let highTime: Date = data[0].openTime;
    let lowTime: Date = data[0].openTime;

    for (const kline of data) {
      const high = useBodyHighLow ? kline.bodyHigh : kline.high;
      const low = useBodyHighLow ? kline.bodyLow : kline.low;

      if (high > highest) {
        highest = high;
        highTime = kline.openTime;
      }

      if (low < lowest) {
        lowest = low;
        lowTime = kline.openTime;
      }
    }

    const range = highest - lowest;
    const rangePercent = lowest > 0 ? (range / lowest) * 100 : 0;

    return {
      symbol: config.symbol,
      interval: data.length > 0 ? this.detectInterval(data) : 'unknown',
      period: JSON.stringify(config.period),
      high: highest,
      low: lowest,
      highTime,
      lowTime,
      range,
      rangePercent,
      calculatedAt: new Date()
    };
  }

  /**
   * Detect the interval from the data
   */
  private detectInterval(data: ExtendedMarketData[]): string {
    if (data.length < 2) return 'unknown';
    
    const timeDiff = data[1].openTime.getTime() - data[0].openTime.getTime();
    
    if (timeDiff <= TIME_CONSTANTS.MINUTE) return '1m';
    if (timeDiff <= 5 * TIME_CONSTANTS.MINUTE) return '5m';
    if (timeDiff <= 15 * TIME_CONSTANTS.MINUTE) return '15m';
    if (timeDiff <= TIME_CONSTANTS.HOUR) return '1h';
    if (timeDiff <= 4 * TIME_CONSTANTS.HOUR) return '4h';
    if (timeDiff <= TIME_CONSTANTS.DAY) return '1d';
    
    return 'unknown';
  }
}
