/**
 * Unit tests for CorrelationCrackStrategy
 */
import 'reflect-metadata';
import { Container } from 'inversify';
import { CorrelationCrackStrategy } from '../correlation-crack.strategy';
import { HighLowIndicatorInterface, HighLowResult, SessionSpec } from '../../indicators/indicator.interfaces';
import { MarketDataProvider, Kline } from '../../../domain/interfaces/market-data.interfaces';
import { Logger } from 'winston';
import { TYPES } from '../../../config/types';
import { CorrelationCrackConfig, CrossDirection } from '../strategy.interfaces';

describe('CorrelationCrackStrategy', () => {
  let strategy: CorrelationCrackStrategy;
  let mockHighLowIndicator: jest.Mocked<HighLowIndicatorInterface>;
  let mockMarketDataProvider: jest.Mocked<MarketDataProvider>;
  let mockLogger: jest.Mocked<Logger>;
  let container: Container;

  const mockKlines: Kline[] = [
    {
      symbol: 'EURUSD',
      openTime: new Date('2025-01-01T10:00:00Z'),
      closeTime: new Date('2025-01-01T10:05:00Z'),
      open: 1.1000,
      high: 1.1020,
      low: 1.0980,
      close: 1.1010,
      volume: 1000,
      trades: 10
    },
    {
      symbol: 'EURUSD',
      openTime: new Date('2025-01-01T10:05:00Z'),
      closeTime: new Date('2025-01-01T10:10:00Z'),
      open: 1.1010,
      high: 1.1050,
      low: 1.0990,
      close: 1.1040,
      volume: 1200,
      trades: 12
    }
  ];

  beforeEach(() => {
    container = new Container();

    // Create mocks
    mockHighLowIndicator = {
      getName: jest.fn().mockReturnValue('HighLowIndicator'),
      validate: jest.fn().mockReturnValue(true),
      getRequiredDataPoints: jest.fn().mockReturnValue(1),
      calculate: jest.fn()
    };

    mockMarketDataProvider = {
      getName: jest.fn().mockReturnValue('MockProvider'),
      getMarketData: jest.fn(),
      getKlines: jest.fn(),
      getTicker24h: jest.fn(),
      isHealthy: jest.fn().mockResolvedValue(true),
      initialize: jest.fn(),
      disconnect: jest.fn()
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as any;

    // Bind mocks to container
    container.bind<HighLowIndicatorInterface>(TYPES.HighLowIndicator).toConstantValue(mockHighLowIndicator);
    container.bind<MarketDataProvider>(TYPES.MarketDataProvider).toConstantValue(mockMarketDataProvider);
    container.bind<Logger>(TYPES.Logger).toConstantValue(mockLogger);

    // Create strategy instance
    strategy = container.resolve(CorrelationCrackStrategy);
  });

  describe('getName', () => {
    it('should return correct strategy name', () => {
      expect(strategy.getName()).toBe('CorrelationCrackStrategy');
    });
  });

  describe('validate', () => {
    it('should validate valid configuration', () => {
      const config: CorrelationCrackConfig = {
        primaryAssets: ['EURUSD', 'GBPUSD'],
        period: 'prev_day',
        direction: CrossDirection.CROSS_UNDER
      };

      expect(strategy.validate(config)).toBe(true);
    });

    it('should reject configuration with less than 2 assets', () => {
      const config: CorrelationCrackConfig = {
        primaryAssets: ['EURUSD'],
        period: 'prev_day',
        direction: CrossDirection.CROSS_UNDER
      };

      expect(strategy.validate(config)).toBe(false);
    });

    it('should reject configuration with more than 4 assets', () => {
      const config: CorrelationCrackConfig = {
        primaryAssets: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'],
        period: 'prev_day',
        direction: CrossDirection.CROSS_UNDER
      };

      expect(strategy.validate(config)).toBe(false);
    });

    it('should reject configuration with invalid direction', () => {
      const config: CorrelationCrackConfig = {
        primaryAssets: ['EURUSD', 'GBPUSD'],
        period: 'prev_day',
        direction: 'invalid' as CrossDirection
      };

      expect(strategy.validate(config)).toBe(false);
    });

    it('should validate session-based period', () => {
      const sessionPeriod: SessionSpec = {
        type: 'time_session',
        startHour: 3,
        endHour: 8,
        timezone: 'America/New_York'
      };

      const config: CorrelationCrackConfig = {
        primaryAssets: ['EURUSD', 'GBPUSD'],
        period: sessionPeriod,
        direction: CrossDirection.CROSS_UNDER
      };

      expect(strategy.validate(config)).toBe(true);
    });

    it('should accept configurable parameters', () => {
      const config: CorrelationCrackConfig = {
        primaryAssets: ['EURUSD', 'GBPUSD'],
        period: 'prev_day',
        direction: CrossDirection.CROSS_UNDER,
        marketDataInterval: '15m',
        klinesLimit: 200,
        crossDetectionLookback: 5,
        timezone: 'Europe/London',
        useBodyHighLow: true,
        minCorrelatedAssets: 2
      };

      expect(strategy.validate(config)).toBe(true);
    });
  });

  describe('checkCrossCondition', () => {
    it('should detect cross-under condition', async () => {
      const klines: Kline[] = [
        { ...mockKlines[0], close: 1.1050 }, // Above reference level
        { ...mockKlines[1], close: 1.0990 }  // Below reference level
      ];

      const result = await strategy.checkCrossCondition(klines, 1.1000, CrossDirection.CROSS_UNDER, 10);

      expect(result.hasCrossed).toBe(true);
      expect(result.crossTime).toEqual(klines[1].openTime);
    });

    it('should detect cross-over condition', async () => {
      const klines: Kline[] = [
        { ...mockKlines[0], close: 1.0990 }, // Below reference level
        { ...mockKlines[1], close: 1.1010 }  // Above reference level
      ];

      const result = await strategy.checkCrossCondition(klines, 1.1000, CrossDirection.CROSS_OVER, 10);

      expect(result.hasCrossed).toBe(true);
      expect(result.crossTime).toEqual(klines[1].openTime);
    });

    it('should not detect cross when no crossing occurs', async () => {
      const klines: Kline[] = [
        { ...mockKlines[0], close: 1.1050 }, // Above reference level
        { ...mockKlines[1], close: 1.1040 }  // Still above reference level
      ];

      const result = await strategy.checkCrossCondition(klines, 1.1000, CrossDirection.CROSS_UNDER, 10);

      expect(result.hasCrossed).toBe(false);
      expect(result.crossTime).toBeUndefined();
    });

    it('should handle insufficient data', async () => {
      const klines: Kline[] = [mockKlines[0]]; // Only one data point

      const result = await strategy.checkCrossCondition(klines, 1.1000, CrossDirection.CROSS_UNDER, 10);

      expect(result.hasCrossed).toBe(false);
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      // Setup default mocks for successful execution
      mockMarketDataProvider.getKlines.mockResolvedValue(mockKlines);
      
      const mockHighLowResult: HighLowResult = {
        symbol: 'EURUSD',
        interval: '5m',
        period: 'prev_day',
        high: 1.1050,
        low: 1.0980,
        highTime: new Date('2025-01-01T10:05:00Z'),
        lowTime: new Date('2025-01-01T10:00:00Z'),
        range: 0.0070,
        rangePercent: 0.64,
        calculatedAt: new Date()
      };
      
      mockHighLowIndicator.calculate.mockResolvedValue(mockHighLowResult);
    });

    it('should execute successfully with valid configuration', async () => {
      const config: CorrelationCrackConfig = {
        primaryAssets: ['EURUSD', 'GBPUSD'],
        period: 'prev_day',
        direction: CrossDirection.CROSS_UNDER
      };

      // Mock different high/low results for each asset
      mockHighLowIndicator.calculate
        .mockResolvedValueOnce({
          symbol: 'EURUSD',
          interval: '5m',
          period: 'prev_day',
          high: 1.1050,
          low: 1.0980,
          highTime: new Date(),
          lowTime: new Date(),
          range: 0.0070,
          rangePercent: 0.64,
          calculatedAt: new Date()
        })
        .mockResolvedValueOnce({
          symbol: 'GBPUSD',
          interval: '5m',
          period: 'prev_day',
          high: 1.2800,
          low: 1.2700,
          highTime: new Date(),
          lowTime: new Date(),
          range: 0.0100,
          rangePercent: 0.79,
          calculatedAt: new Date()
        });

      const result = await strategy.execute(config);

      expect(result.success).toBe(true);
      expect(mockMarketDataProvider.getKlines).toHaveBeenCalledTimes(2);
      expect(mockHighLowIndicator.calculate).toHaveBeenCalledTimes(2);
    });

    it('should return error for invalid configuration', async () => {
      const config: CorrelationCrackConfig = {
        primaryAssets: ['EURUSD'], // Invalid: only one asset
        period: 'prev_day',
        direction: CrossDirection.CROSS_UNDER
      };

      const result = await strategy.execute(config);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid configuration');
    });

    it('should handle market data provider errors', async () => {
      const config: CorrelationCrackConfig = {
        primaryAssets: ['EURUSD', 'GBPUSD'],
        period: 'prev_day',
        direction: CrossDirection.CROSS_UNDER
      };

      mockMarketDataProvider.getKlines.mockRejectedValue(new Error('Network error'));

      const result = await strategy.execute(config);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch market data');
    });

    it('should handle indicator calculation errors', async () => {
      const config: CorrelationCrackConfig = {
        primaryAssets: ['EURUSD', 'GBPUSD'],
        period: 'prev_day',
        direction: CrossDirection.CROSS_UNDER
      };

      mockHighLowIndicator.calculate.mockRejectedValue(new Error('Calculation error'));

      const result = await strategy.execute(config);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to calculate reference level');
    });
  });

  describe('correlation crack detection', () => {
    it('should generate signal when one asset crosses and others do not', async () => {
      const config: CorrelationCrackConfig = {
        primaryAssets: ['EURUSD', 'GBPUSD'],
        period: 'prev_day',
        direction: CrossDirection.CROSS_UNDER
      };

      // Mock market data: EURUSD crosses under, GBPUSD does not
      const eurKlines: Kline[] = [
        { ...mockKlines[0], symbol: 'EURUSD', close: 1.1060 }, // Above HLS
        { ...mockKlines[1], symbol: 'EURUSD', close: 1.1030 }  // Below HLS (crossed)
      ];

      const gbpKlines: Kline[] = [
        { ...mockKlines[0], symbol: 'GBPUSD', close: 1.2850 }, // Above HLS
        { ...mockKlines[1], symbol: 'GBPUSD', close: 1.2820 }  // Still above HLS
      ];

      mockMarketDataProvider.getKlines
        .mockResolvedValueOnce(eurKlines)
        .mockResolvedValueOnce(gbpKlines);

      mockHighLowIndicator.calculate
        .mockResolvedValueOnce({
          symbol: 'EURUSD',
          interval: '5m',
          period: 'prev_day',
          high: 1.1050, // HLS level
          low: 1.0980,
          highTime: new Date(),
          lowTime: new Date(),
          range: 0.0070,
          rangePercent: 0.64,
          calculatedAt: new Date()
        })
        .mockResolvedValueOnce({
          symbol: 'GBPUSD',
          interval: '5m',
          period: 'prev_day',
          high: 1.2800, // HLS level
          low: 1.2700,
          highTime: new Date(),
          lowTime: new Date(),
          range: 0.0100,
          rangePercent: 0.79,
          calculatedAt: new Date()
        });

      const result = await strategy.execute(config);

      expect(result.success).toBe(true);
      expect(result.signal).toBeDefined();
      expect(result.signal?.direction).toBe(CrossDirection.CROSS_UNDER);
      expect(result.signal?.triggerAsset).toBe('EURUSD');
      expect(result.signal?.correlatedAssets).toContain('GBPUSD');
      expect(result.signal?.confidence).toBeGreaterThan(0);
    });

    it('should not generate signal when multiple assets cross', async () => {
      const config: CorrelationCrackConfig = {
        primaryAssets: ['EURUSD', 'GBPUSD'],
        period: 'prev_day',
        direction: CrossDirection.CROSS_UNDER
      };

      // Mock market data: Both assets cross under
      const eurKlines: Kline[] = [
        { ...mockKlines[0], symbol: 'EURUSD', close: 1.1060 }, // Above HLS
        { ...mockKlines[1], symbol: 'EURUSD', close: 1.1030 }  // Below HLS (crossed)
      ];

      const gbpKlines: Kline[] = [
        { ...mockKlines[0], symbol: 'GBPUSD', close: 1.2850 }, // Above HLS
        { ...mockKlines[1], symbol: 'GBPUSD', close: 1.2750 }  // Below HLS (crossed)
      ];

      mockMarketDataProvider.getKlines
        .mockResolvedValueOnce(eurKlines)
        .mockResolvedValueOnce(gbpKlines);

      mockHighLowIndicator.calculate
        .mockResolvedValueOnce({
          symbol: 'EURUSD',
          interval: '5m',
          period: 'prev_day',
          high: 1.1050,
          low: 1.0980,
          highTime: new Date(),
          lowTime: new Date(),
          range: 0.0070,
          rangePercent: 0.64,
          calculatedAt: new Date()
        })
        .mockResolvedValueOnce({
          symbol: 'GBPUSD',
          interval: '5m',
          period: 'prev_day',
          high: 1.2800,
          low: 1.2700,
          highTime: new Date(),
          lowTime: new Date(),
          range: 0.0100,
          rangePercent: 0.79,
          calculatedAt: new Date()
        });

      const result = await strategy.execute(config);

      expect(result.success).toBe(true);
      expect(result.signal).toBeUndefined(); // No signal should be generated
    });
  });
});
