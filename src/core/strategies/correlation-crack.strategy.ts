/**
 * Correlation Crack Strategy implementation
 * Detects when one correlated asset breaks a key level while others don't
 */
import { injectable, inject } from 'inversify';
import {
  CorrelationCrackStrategyInterface,
  CorrelationCrackConfig,
  StrategyResult,
  StrategySignal,
  CrossDirection,
  AssetCondition,
  ExtendedPeriodSpec
} from './strategy.interfaces';
import { HighLowIndicatorInterface, HighLowIndicatorConfig, SessionSpec } from '../indicators/indicator.interfaces';
import { MarketDataProvider } from '../../domain/interfaces/market-data.interfaces';
import { Kline } from '../../domain/interfaces/market-data.interfaces';
import { TYPES } from '../../config/types';
import { Logger } from 'winston';
import { TRADING_CONSTANTS, STRATEGY_CONSTANTS } from '../../config/constants';
import { validateSessionSpec, isSessionSpec, getRecentKlines } from '../../utils/date-helpers';

@injectable()
export class CorrelationCrackStrategy implements CorrelationCrackStrategyInterface {
  constructor(
    @inject(TYPES.HighLowIndicator) private highLowIndicator: HighLowIndicatorInterface,
    @inject(TYPES.MarketDataProvider) private marketDataProvider: MarketDataProvider,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  getName(): string {
    return 'CorrelationCrackStrategy';
  }

  /**
   * Validate strategy configuration
   */
  validate(config: CorrelationCrackConfig): boolean {
    // Check minimum requirements
    if (!config.primaryAssets || config.primaryAssets.length < 2 || config.primaryAssets.length > 4) {
      this.logger.error('Primary assets must contain 2-4 symbols');
      return false;
    }

    if (!config.period) {
      this.logger.error('Period specification is required');
      return false;
    }

    if (!Object.values(CrossDirection).includes(config.direction)) {
      this.logger.error('Invalid cross direction specified');
      return false;
    }

    // Validate session spec if it's a time session
    if (isSessionSpec(config.period)) {
      return validateSessionSpec(config.period);
    }

    return true;
  }

  /**
   * Execute the correlation crack strategy
   */
  async execute(config: CorrelationCrackConfig): Promise<StrategyResult<CorrelationCrackConfig>> {
    try {
      if (!this.validate(config)) {
        return {
          strategyName: this.getName(),
          executedAt: new Date(),
          config,
          success: false,
          error: 'Invalid configuration'
        };
      }

      this.logger.info(`Executing ${this.getName()} for assets: ${config.primaryAssets.join(', ')}`);

      // Fetch market data for all assets
      const assetData = await this.fetchAssetData(config.primaryAssets, config);
      
      // Calculate reference levels (HLS/LLS) for each asset
      const referenceLevels = await this.calculateReferenceLevels(assetData, config);
      
      // Check cross conditions for each asset
      const conditions = await this.checkAllAssetConditions(assetData, referenceLevels, config);
      
      // Analyze correlation crack pattern
      const signal = this.analyzeCorrelationCrack(conditions, config);

      const result: StrategyResult<CorrelationCrackConfig> = {
        strategyName: this.getName(),
        executedAt: new Date(),
        config,
        success: true,
        metadata: {
          referenceLevels,
          assetsAnalyzed: config.primaryAssets.length,
          assetConditions: conditions
        }
      };

      if (signal) {
        result.signal = signal;
      }

      return result;

    } catch (error) {
      this.logger.error(`Error executing ${this.getName()}:`, error);
      return {
        strategyName: this.getName(),
        executedAt: new Date(),
        config,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check cross condition for specific asset
   */
  async checkCrossCondition(
    klines: Kline[], 
    referenceLevel: number, 
    direction: CrossDirection,
    lookbackPeriods?: number
  ): Promise<{ hasCrossed: boolean; crossTime?: Date }> {
    if (klines.length < 2) {
      return { hasCrossed: false };
    }

    // Use configurable lookback periods, default to constant
    const periodsToCheck = lookbackPeriods || STRATEGY_CONSTANTS.CROSS_DETECTION_LOOKBACK_PERIODS;
    
    // Get the most recent periods to check (klines are assumed to be pre-sorted)
    const recentKlines = getRecentKlines(klines, periodsToCheck);
    
    for (let i = 1; i < recentKlines.length; i++) {
      const prevKline = recentKlines[i - 1];
      const currentKline = recentKlines[i];

      if (direction === CrossDirection.CROSS_OVER) {
        // Price was below reference level and crossed above
        if (prevKline.close <= referenceLevel && currentKline.close > referenceLevel) {
          return { 
            hasCrossed: true, 
            crossTime: currentKline.openTime 
          };
        }
      } else if (direction === CrossDirection.CROSS_UNDER) {
        // Price was above reference level and crossed below
        if (prevKline.close >= referenceLevel && currentKline.close < referenceLevel) {
          return { 
            hasCrossed: true, 
            crossTime: currentKline.openTime 
          };
        }
      }
    }

    return { hasCrossed: false };
  }

  /**
   * Fetch market data for all assets
   */
  private async fetchAssetData(symbols: string[], config?: CorrelationCrackConfig): Promise<Map<string, Kline[]>> {
    const assetData = new Map<string, Kline[]>();
    
    // Use configurable parameters
    const interval = config?.marketDataInterval || STRATEGY_CONSTANTS.DEFAULT_MARKET_DATA_INTERVAL;
    const limit = config?.klinesLimit || STRATEGY_CONSTANTS.DEFAULT_KLINES_LIMIT;
    
    for (const symbol of symbols) {
      try {
        const klines = await this.marketDataProvider.getKlines(symbol, interval, limit);
        assetData.set(symbol, klines);
        this.logger.debug(`Fetched ${klines.length} klines for ${symbol}`);
      } catch (error) {
        this.logger.error(`Failed to fetch data for ${symbol}:`, error);
        throw new Error(`Failed to fetch market data for ${symbol}`);
      }
    }

    return assetData;
  }

  /**
   * Calculate reference levels (HLS/LLS) for each asset
   */
  private async calculateReferenceLevels(
    assetData: Map<string, Kline[]>, 
    config: CorrelationCrackConfig
  ): Promise<Map<string, number>> {
    const referenceLevels = new Map<string, number>();

    for (const [symbol, klines] of assetData.entries()) {
      const indicatorConfig: HighLowIndicatorConfig = {
        symbol,
        period: config.period,
        useBodyHighLow: config.useBodyHighLow || false,
        timezone: config.timezone || TRADING_CONSTANTS.DEFAULT_TIMEZONE
      };

      try {
        const result = await this.highLowIndicator.calculate(klines, indicatorConfig);
        
        // Use high for cross-under (HLS) and low for cross-over (LLS)
        const referenceLevel = config.direction === CrossDirection.CROSS_UNDER 
          ? result.high 
          : result.low;
        
        referenceLevels.set(symbol, referenceLevel);
        
        this.logger.debug(`${symbol} reference level (${config.direction}): ${referenceLevel}`);
      } catch (error) {
        this.logger.error(`Failed to calculate reference level for ${symbol}:`, error);
        throw new Error(`Failed to calculate reference level for ${symbol}`);
      }
    }

    return referenceLevels;
  }

  /**
   * Check cross conditions for all assets
   */
  private async checkAllAssetConditions(
    assetData: Map<string, Kline[]>,
    referenceLevels: Map<string, number>,
    config: CorrelationCrackConfig
  ): Promise<AssetCondition[]> {
    const conditions: AssetCondition[] = [];

    for (const [symbol, klines] of assetData.entries()) {
      const referenceLevel = referenceLevels.get(symbol);
      if (!referenceLevel) {
        throw new Error(`No reference level found for ${symbol}`);
      }

      const currentPrice = klines[klines.length - 1]?.close || 0;
      const crossResult = await this.checkCrossCondition(
        klines, 
        referenceLevel, 
        config.direction,
        config.crossDetectionLookback || STRATEGY_CONSTANTS.CROSS_DETECTION_LOOKBACK_PERIODS
      );

      const condition: AssetCondition = {
        symbol,
        hasCrossed: crossResult.hasCrossed,
        currentPrice,
        referenceLevel
      };

      if (crossResult.hasCrossed) {
        condition.crossDirection = config.direction;
      }

      if (crossResult.crossTime) {
        condition.crossTime = crossResult.crossTime;
      }

      conditions.push(condition);
    }

    return conditions;
  }

  /**
   * Analyze correlation crack pattern and generate signal
   */
  private analyzeCorrelationCrack(
    conditions: AssetCondition[], 
    config: CorrelationCrackConfig
  ): StrategySignal | undefined {
    const crossedAssets = conditions.filter(c => c.hasCrossed);
    const notCrossedAssets = conditions.filter(c => !c.hasCrossed);
    
    const minCorrelatedAssets = config.minCorrelatedAssets || 1;

    // Strategy condition: exactly one asset crossed, others didn't
    if (crossedAssets.length === 1 && notCrossedAssets.length >= minCorrelatedAssets) {
      const triggerAsset = crossedAssets[0];
      
      const confidence = this.calculateConfidence(conditions, config);
      
      this.logger.info(`Correlation crack detected: ${triggerAsset.symbol} crossed ${config.direction}`);

      return {
        direction: config.direction,
        triggerAsset: triggerAsset.symbol,
        correlatedAssets: notCrossedAssets.map(c => c.symbol),
        referenceLevel: triggerAsset.referenceLevel,
        confidence,
        timestamp: new Date(),
      };
    }

    this.logger.debug(`No correlation crack pattern detected. Crossed: ${crossedAssets.length}, Not crossed: ${notCrossedAssets.length}`);
    return undefined;
  }

  /**
   * Calculate confidence score based on various factors
   */
  private calculateConfidence(conditions: AssetCondition[], config: CorrelationCrackConfig): number {
    let confidence = STRATEGY_CONSTANTS.BASE_CONFIDENCE_SCORE;

    // Factor 1: More correlated assets that didn't cross = higher confidence
    const notCrossedCount = conditions.filter(c => !c.hasCrossed).length;
    confidence += (notCrossedCount - 1) * STRATEGY_CONSTANTS.CONFIDENCE_INCREMENT_PER_ASSET;

    // Factor 2: Distance from reference level for non-crossed assets
    const notCrossedAssets = conditions.filter(c => !c.hasCrossed);
    if (notCrossedAssets.length > 0) {
      const avgDistance = notCrossedAssets.reduce((sum, asset) => {
        const distance = Math.abs(asset.currentPrice - asset.referenceLevel) / asset.referenceLevel;
        return sum + distance;
      }, 0) / notCrossedAssets.length;

      // Higher distance = higher confidence (more separation)
      confidence += Math.min(
        avgDistance * STRATEGY_CONSTANTS.DISTANCE_CONFIDENCE_MULTIPLIER, 
        STRATEGY_CONSTANTS.MAX_DISTANCE_CONFIDENCE_BOOST
      );
    }

    return Math.min(Math.max(confidence, 0), 1);
  }

}
