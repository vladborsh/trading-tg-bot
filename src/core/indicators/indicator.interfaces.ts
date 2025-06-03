/**
 * Indicator interfaces and types for trading analysis
 */
import { Kline } from '../../domain/interfaces/market-data.interfaces';

/**
 * Base indicator interface
 */
export interface Indicator<T> {
  getName(): string;
  validate(data: Kline[]): boolean;
  getRequiredDataPoints(): number;
}

/**
 * High/Low specific indicator interface
 */
export interface HighLowIndicatorInterface extends Indicator<HighLowResult> {
  calculate(data: Kline[], config: HighLowIndicatorConfig): Promise<HighLowResult>;
}

/**
 * High/Low calculation result
 */
export interface HighLowResult {
  symbol: string;
  interval: string;
  period: string;
  high: number;
  low: number;
  highTime: Date;
  lowTime: Date;
  range: number;
  rangePercent: number;
  calculatedAt: Date;
}

/**
 * Period specification for indicators
 */
export type PeriodSpec = 
  | string // Standard intervals like '1h', '4h', '1d'
  | 'prev_day' 
  | 'prev_week' 
  | 'prev_month'
  | 'current_day'
  | 'current_week'
  | 'current_month'
  | { 
      type: 'custom';
      startTime: Date;
      endTime: Date;
    }
  | {
      type: 'rolling';
      periods: number;
      interval: string;
    };

/**
 * Configuration for High/Low indicator
 */
export interface HighLowIndicatorConfig {
  symbol: string;
  period: PeriodSpec;
  useBodyHighLow?: boolean; // Use open/close instead of high/low for body calculation
  timezone?: string; // For day/week calculations
}

/**
 * Extended market data with additional calculated fields
 */
export interface ExtendedMarketData extends Kline {
  bodyHigh: number; // Max of open/close
  bodyLow: number; // Min of open/close
  upperWick: number; // high - bodyHigh
  lowerWick: number; // bodyLow - low
  isGreen: boolean; // close > open
}
