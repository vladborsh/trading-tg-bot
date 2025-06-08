/**
 * Strategy interfaces and types for trading analysis
 */
import { Kline } from '../../domain/interfaces/market-data.interfaces';
import { PeriodSpec } from '../indicators/indicator.interfaces';

/**
 * Base strategy interface
 */
export interface Strategy<T> {
  getName(): string;
  validate(config: T): boolean;
  execute(config: T): Promise<StrategyResult<T>>;
}

/**
 * Extended period specification (alias for clarity)
 */
export type ExtendedPeriodSpec = PeriodSpec;

/**
 * Cross direction enum
 */
export enum CrossDirection {
  CROSS_OVER = 'cross_over', // Price was below and crossed above
  CROSS_UNDER = 'cross_under' // Price was above and crossed below
}

/**
 * Asset correlation condition
 */
export interface AssetCondition {
  symbol: string;
  hasCrossed: boolean;
  crossDirection?: CrossDirection;
  currentPrice: number;
  referenceLevel: number; // HLS or LLS
  crossTime?: Date;
}

/**
 * Correlation crack configuration
 */
export interface CorrelationCrackConfig {
  primaryAssets: string[]; // 2-4 correlated assets
  period: ExtendedPeriodSpec; // London session, prev_day, etc.
  direction: CrossDirection; // Looking for cross-over or cross-under
  useBodyHighLow?: boolean; // Use open/close instead of high/low
  timezone?: string;
  minCorrelatedAssets?: number; // Minimum assets that should NOT have the condition (default: 1)
  marketDataInterval?: string; // Interval for fetching market data (default: '5m')
  klinesLimit?: number; // Number of klines to fetch (default: 100)
  crossDetectionLookback?: number; // Number of recent candles to check for crosses (default: 10)
}

/**
 * Strategy signal interface
 */
export interface StrategySignal {
  triggerAsset: string;
  direction: CrossDirection;
  correlatedAssets: string[];
  referenceLevel: number;
  confidence: number;
  timestamp: Date;
}

/**
 * Strategy execution result
 */
export interface StrategyResult<T = unknown> {
  strategyName: string;
  executedAt: Date;
  config: T;
  success: boolean;
  signal?: StrategySignal;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Correlation crack strategy interface
 */
export interface CorrelationCrackStrategyInterface extends Strategy<CorrelationCrackConfig> {
  checkCrossCondition(
    klines: Kline[], 
    referenceLevel: number, 
    direction: CrossDirection,
    lookbackPeriods?: number
  ): Promise<{ hasCrossed: boolean; crossTime?: Date }>;
}
