/**
 * Unit tests for IndicatorService
 */
import 'reflect-metadata';
import { IndicatorServiceImpl } from '../indicator.service';
import { HighLowIndicatorInterface, HighLowIndicatorConfig } from '../indicator.interfaces';
import { MarketDataProvider, Kline } from '../../../domain/interfaces/market-data.interfaces';
import { Logger } from '../../../utils/logger';

describe('IndicatorServiceImpl', () => {
  let service: IndicatorServiceImpl;
  let mockLogger: jest.Mocked<Logger>;
  let mockMarketDataProvider: jest.Mocked<MarketDataProvider>;
  let mockHighLowIndicator: jest.Mocked<HighLowIndicatorInterface>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    mockMarketDataProvider = {
      getName: jest.fn().mockReturnValue('MockProvider'),
      getMarketData: jest.fn(),
      getKlines: jest.fn(),
      getTicker24h: jest.fn(),
      isHealthy: jest.fn().mockResolvedValue(true),
      initialize: jest.fn(),
      disconnect: jest.fn(),
    };

    mockHighLowIndicator = {
      getName: jest.fn().mockReturnValue('HighLowIndicator'),
      getRequiredDataPoints: jest.fn().mockReturnValue(1),
      validate: jest.fn().mockReturnValue(true),
      calculate: jest.fn(),
    } as any;

    service = new IndicatorServiceImpl(
      mockLogger,
      mockMarketDataProvider,
      mockHighLowIndicator
    );
  });

  describe('calculateHighLow', () => {
    const sampleKlines: Kline[] = [
      {
        symbol: 'BTC/USDT',
        openTime: new Date('2023-01-01T00:00:00Z'),
        closeTime: new Date('2023-01-01T01:00:00Z'),
        open: 100,
        high: 110,
        low: 95,
        close: 105,
        volume: 1000,
        trades: 50
      },
      {
        symbol: 'BTC/USDT',
        openTime: new Date('2023-01-01T01:00:00Z'),
        closeTime: new Date('2023-01-01T02:00:00Z'),
        open: 105,
        high: 120,
        low: 90,
        close: 115,
        volume: 1200,
        trades: 60
      }
    ];

    const mockHighLowResult = {
      symbol: 'BTC/USDT',
      interval: '1h',
      period: '\"1h\"',
      high: 120,
      low: 90,
      highTime: new Date('2023-01-01T01:00:00Z'),
      lowTime: new Date('2023-01-01T01:00:00Z'),
      range: 30,
      rangePercent: 33.33,
      calculatedAt: new Date()
    };

    it('should calculate high/low indicator successfully', async () => {
      const config: HighLowIndicatorConfig = {
        symbol: 'BTC/USDT',
        period: '1h'
      };

      mockMarketDataProvider.getKlines.mockResolvedValue(sampleKlines);
      mockHighLowIndicator.calculate.mockResolvedValue(mockHighLowResult);

      const result = await service.calculateHighLow(config);

      expect(mockMarketDataProvider.getKlines).toHaveBeenCalledWith('BTC/USDT', '1h', 100);
      expect(mockHighLowIndicator.calculate).toHaveBeenCalledWith(sampleKlines, config);
      expect(result).toEqual(mockHighLowResult);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Calculating high/low indicator',
        { symbol: 'BTC/USDT', period: '1h' }
      );
    });

    it('should handle prev_day period correctly', async () => {
      const config: HighLowIndicatorConfig = {
        symbol: 'BTC/USDT',
        period: 'prev_day'
      };

      mockMarketDataProvider.getKlines.mockResolvedValue(sampleKlines);
      mockHighLowIndicator.calculate.mockResolvedValue(mockHighLowResult);

      const result = await service.calculateHighLow(config);

      expect(mockMarketDataProvider.getKlines).toHaveBeenCalledWith('BTC/USDT', '1h', 48);
      expect(result).toEqual(mockHighLowResult);
    });

    it('should handle prev_week period correctly', async () => {
      const config: HighLowIndicatorConfig = {
        symbol: 'BTC/USDT',
        period: 'prev_week'
      };

      mockMarketDataProvider.getKlines.mockResolvedValue(sampleKlines);
      mockHighLowIndicator.calculate.mockResolvedValue(mockHighLowResult);

      const result = await service.calculateHighLow(config);

      expect(mockMarketDataProvider.getKlines).toHaveBeenCalledWith('BTC/USDT', '4h', 84);
      expect(result).toEqual(mockHighLowResult);
    });

    it('should handle prev_month period correctly', async () => {
      const config: HighLowIndicatorConfig = {
        symbol: 'BTC/USDT',
        period: 'prev_month'
      };

      mockMarketDataProvider.getKlines.mockResolvedValue(sampleKlines);
      mockHighLowIndicator.calculate.mockResolvedValue(mockHighLowResult);

      const result = await service.calculateHighLow(config);

      expect(mockMarketDataProvider.getKlines).toHaveBeenCalledWith('BTC/USDT', '1d', 62);
      expect(result).toEqual(mockHighLowResult);
    });

    it('should handle rolling period correctly', async () => {
      const config: HighLowIndicatorConfig = {
        symbol: 'BTC/USDT',
        period: {
          type: 'rolling',
          periods: 24,
          interval: '1h'
        }
      };

      mockMarketDataProvider.getKlines.mockResolvedValue(sampleKlines);
      mockHighLowIndicator.calculate.mockResolvedValue(mockHighLowResult);

      const result = await service.calculateHighLow(config);

      expect(mockMarketDataProvider.getKlines).toHaveBeenCalledWith('BTC/USDT', '1h', 24);
      expect(result).toEqual(mockHighLowResult);
    });

    it('should handle custom period correctly', async () => {
      const config: HighLowIndicatorConfig = {
        symbol: 'BTC/USDT',
        period: {
          type: 'custom',
          startTime: new Date('2023-01-01T00:00:00Z'),
          endTime: new Date('2023-01-01T12:00:00Z') // 12 hours
        }
      };

      mockMarketDataProvider.getKlines.mockResolvedValue(sampleKlines);
      mockHighLowIndicator.calculate.mockResolvedValue(mockHighLowResult);

      const result = await service.calculateHighLow(config);

      expect(mockMarketDataProvider.getKlines).toHaveBeenCalledWith('BTC/USDT', '1h', 12);
      expect(result).toEqual(mockHighLowResult);
    });

    it('should throw error when no market data available', async () => {
      const config: HighLowIndicatorConfig = {
        symbol: 'BTC/USDT',
        period: '1h'
      };

      mockMarketDataProvider.getKlines.mockResolvedValue([]);

      await expect(service.calculateHighLow(config)).rejects.toThrow(
        'No market data available for BTC/USDT'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to calculate high/low indicator',
        expect.objectContaining({
          symbol: 'BTC/USDT',
          period: '1h'
        })
      );
    });

    it('should handle market data provider errors', async () => {
      const config: HighLowIndicatorConfig = {
        symbol: 'BTC/USDT',
        period: '1h'
      };

      const error = new Error('Market data fetch failed');
      mockMarketDataProvider.getKlines.mockRejectedValue(error);

      await expect(service.calculateHighLow(config)).rejects.toThrow(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to calculate high/low indicator',
        expect.objectContaining({
          symbol: 'BTC/USDT',
          period: '1h',
          error: 'Market data fetch failed'
        })
      );
    });

    it('should handle indicator calculation errors', async () => {
      const config: HighLowIndicatorConfig = {
        symbol: 'BTC/USDT',
        period: '1h'
      };

      const error = new Error('Indicator calculation failed');
      mockMarketDataProvider.getKlines.mockResolvedValue(sampleKlines);
      mockHighLowIndicator.calculate.mockRejectedValue(error);

      await expect(service.calculateHighLow(config)).rejects.toThrow(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to calculate high/low indicator',
        expect.objectContaining({
          symbol: 'BTC/USDT',
          period: '1h',
          error: 'Indicator calculation failed'
        })
      );
    });
  });

  describe('calculateMultipleHighLow', () => {
    it('should calculate multiple indicators in parallel', async () => {
      const configs: HighLowIndicatorConfig[] = [
        { symbol: 'BTC/USDT', period: '1h' },
        { symbol: 'ETH/USDT', period: 'prev_day' }
      ];

      const mockResults = [
        {
          symbol: 'BTC/USDT',
          interval: '1h',
          period: '\"1h\"',
          high: 120,
          low: 90,
          highTime: new Date(),
          lowTime: new Date(),
          range: 30,
          rangePercent: 33.33,
          calculatedAt: new Date()
        },
        {
          symbol: 'ETH/USDT',
          interval: '1h',
          period: '\"prev_day\"',
          high: 220,
          low: 190,
          highTime: new Date(),
          lowTime: new Date(),
          range: 30,
          rangePercent: 15.79,
          calculatedAt: new Date()
        }
      ];

      // Mock the service's calculateHighLow method
      jest.spyOn(service, 'calculateHighLow')
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      const results = await service.calculateMultipleHighLow(configs);

      expect(results).toEqual(mockResults);
      expect(service.calculateHighLow).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Calculating multiple high/low indicators',
        { count: 2 }
      );
    });

    it('should handle errors in multiple calculations', async () => {
      const configs: HighLowIndicatorConfig[] = [
        { symbol: 'BTC/USDT', period: '1h' }
      ];

      const error = new Error('Calculation failed');
      jest.spyOn(service, 'calculateHighLow').mockRejectedValue(error);

      await expect(service.calculateMultipleHighLow(configs)).rejects.toThrow(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to calculate multiple high/low indicators',
        { error }
      );
    });
  });

  describe('getHighLowForPreviousPeriod', () => {
    it('should calculate high/low for previous day', async () => {
      const mockResult = {
        symbol: 'BTC/USDT',
        interval: '1h',
        period: '\"prev_day\"',
        high: 120,
        low: 90,
        highTime: new Date(),
        lowTime: new Date(),
        range: 30,
        rangePercent: 33.33,
        calculatedAt: new Date()
      };

      jest.spyOn(service, 'calculateHighLow').mockResolvedValue(mockResult);

      const result = await service.getHighLowForPreviousPeriod('BTC/USDT', 'day');

      expect(service.calculateHighLow).toHaveBeenCalledWith({
        symbol: 'BTC/USDT',
        period: 'prev_day',
        useBodyHighLow: false,
        timezone: 'UTC'
      });
      expect(result).toEqual(mockResult);
    });

    it('should calculate high/low for previous week', async () => {
      const mockResult = {
        symbol: 'ETH/USDT',
        interval: '4h',
        period: '\"prev_week\"',
        high: 220,
        low: 190,
        highTime: new Date(),
        lowTime: new Date(),
        range: 30,
        rangePercent: 15.79,
        calculatedAt: new Date()
      };

      jest.spyOn(service, 'calculateHighLow').mockResolvedValue(mockResult);

      const result = await service.getHighLowForPreviousPeriod('ETH/USDT', 'week', '4h');

      expect(service.calculateHighLow).toHaveBeenCalledWith({
        symbol: 'ETH/USDT',
        period: 'prev_week',
        useBodyHighLow: false,
        timezone: 'UTC'
      });
      expect(result).toEqual(mockResult);
    });

    it('should calculate high/low for previous month', async () => {
      const mockResult = {
        symbol: 'ADA/USDT',
        interval: '1d',
        period: '\"prev_month\"',
        high: 1.5,
        low: 0.8,
        highTime: new Date(),
        lowTime: new Date(),
        range: 0.7,
        rangePercent: 87.5,
        calculatedAt: new Date()
      };

      jest.spyOn(service, 'calculateHighLow').mockResolvedValue(mockResult);

      const result = await service.getHighLowForPreviousPeriod('ADA/USDT', 'month');

      expect(service.calculateHighLow).toHaveBeenCalledWith({
        symbol: 'ADA/USDT',
        period: 'prev_month',
        useBodyHighLow: false,
        timezone: 'UTC'
      });
      expect(result).toEqual(mockResult);
    });
  });
});
