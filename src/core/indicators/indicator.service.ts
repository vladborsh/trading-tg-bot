/**
 * Indicator Service for managing and calculating trading indicators
 */
import { injectable, inject } from 'inversify';
import { HighLowIndicatorInterface, HighLowIndicatorConfig, HighLowResult, PeriodSpec } from './indicator.interfaces';
import { MarketDataProvider, Kline } from '../../domain/interfaces/market-data.interfaces';
import { TYPES } from '../../config/types';
import { Logger } from '../../utils/logger';

/**
 * Service interface for indicator calculations
 */
export interface IndicatorService {
  calculateHighLow(config: HighLowIndicatorConfig): Promise<HighLowResult>;
  calculateMultipleHighLow(configs: HighLowIndicatorConfig[]): Promise<HighLowResult[]>;
  getHighLowForPreviousPeriod(symbol: string, period: 'day' | 'week' | 'month', interval?: string): Promise<HighLowResult>;
}

@injectable()
export class IndicatorServiceImpl implements IndicatorService {
  constructor(
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.MarketDataProvider) private marketDataProvider: MarketDataProvider,
    @inject(TYPES.HighLowIndicator) private highLowIndicator: HighLowIndicatorInterface
  ) {}

  /**
   * Calculate high/low for a specific configuration
   */
  async calculateHighLow(config: HighLowIndicatorConfig): Promise<HighLowResult> {
    this.logger.info('Calculating high/low indicator', { 
      symbol: config.symbol, 
      period: config.period 
    });

    try {
      // Determine the appropriate data range and interval
      const { interval, limit } = this.determineDataRequirements(config.period);
      
      // Fetch market data
      const klines = await this.marketDataProvider.getKlines(
        config.symbol, 
        interval, 
        limit
      );

      if (klines.length === 0) {
        throw new Error(`No market data available for ${config.symbol}`);
      }

      // Calculate the indicator
      const result = await this.highLowIndicator.calculate(klines, config);
      
      this.logger.info('High/Low calculation completed', {
        symbol: config.symbol,
        high: result.high,
        low: result.low,
        range: result.range,
        rangePercent: result.rangePercent
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to calculate high/low indicator', {
        symbol: config.symbol,
        period: config.period,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Calculate high/low for multiple configurations in parallel
   */
  async calculateMultipleHighLow(configs: HighLowIndicatorConfig[]): Promise<HighLowResult[]> {
    this.logger.info('Calculating multiple high/low indicators', { 
      count: configs.length 
    });

    const promises = configs.map(config => this.calculateHighLow(config));
    
    try {
      const results = await Promise.all(promises);
      
      this.logger.info('Multiple high/low calculations completed', {
        successCount: results.length,
        totalCount: configs.length
      });

      return results;
    } catch (error) {
      this.logger.error('Failed to calculate multiple high/low indicators', { error });
      throw error;
    }
  }

  /**
   * Convenience method for calculating high/low for previous periods
   */
  async getHighLowForPreviousPeriod(
    symbol: string, 
    period: 'day' | 'week' | 'month',
    interval = '1h'
  ): Promise<HighLowResult> {
    const periodSpec: PeriodSpec = `prev_${period}` as PeriodSpec;
    
    const config: HighLowIndicatorConfig = {
      symbol,
      period: periodSpec,
      useBodyHighLow: false,
      timezone: 'UTC'
    };

    return this.calculateHighLow(config);
  }

  /**
   * Determine data requirements based on period specification
   */
  private determineDataRequirements(period: PeriodSpec): { interval: string; limit: number } {
    if (typeof period === 'string') {
      switch (period) {
        case 'prev_day':
        case 'current_day':
          return { interval: '1h', limit: 48 }; // 2 days of hourly data
        
        case 'prev_week':
        case 'current_week':
          return { interval: '4h', limit: 84 }; // 2 weeks of 4-hour data
        
        case 'prev_month':
        case 'current_month':
          return { interval: '1d', limit: 62 }; // 2 months of daily data
        
        default:
          // Standard interval like '1h', '4h', '1d'
          return { interval: period, limit: 100 };
      }
    } else if (period.type === 'rolling') {
      return { interval: period.interval, limit: period.periods };
    } else if (period.type === 'custom') {
      // For custom periods, use hourly data and calculate the required limit
      const timeDiff = period.endTime.getTime() - period.startTime.getTime();
      const hours = Math.ceil(timeDiff / (1000 * 60 * 60));
      return { interval: '1h', limit: Math.min(hours, 1000) };
    }

    // Default fallback
    return { interval: '1h', limit: 100 };
  }
}
