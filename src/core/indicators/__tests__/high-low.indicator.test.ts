/**
 * Unit tests for HighLowIndicator
 */
import 'reflect-metadata';
import { HighLowIndicator } from '../high-low.indicator';
import { HighLowIndicatorConfig, PeriodSpec } from '../indicator.interfaces';
import { Kline } from '../../../domain/interfaces/market-data.interfaces';
import { Logger } from '../../../utils/logger';

describe('HighLowIndicator', () => {
  let indicator: HighLowIndicator;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    indicator = new HighLowIndicator(mockLogger);
  });

  describe('getName', () => {
    it('should return the correct indicator name', () => {
      expect(indicator.getName()).toBe('HighLowIndicator');
    });
  });

  describe('getRequiredDataPoints', () => {
    it('should return minimum required data points', () => {
      expect(indicator.getRequiredDataPoints()).toBe(1);
    });
  });

  describe('validate', () => {
    it('should validate correct kline data', () => {
      const validData: Kline[] = [
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
        }
      ];

      expect(indicator.validate(validData)).toBe(true);
    });

    it('should reject empty data', () => {
      expect(indicator.validate([])).toBe(false);
    });

    it('should reject invalid data with high < low', () => {
      const invalidData: Kline[] = [
        {
          symbol: 'BTC/USDT',
          openTime: new Date('2023-01-01T00:00:00Z'),
          closeTime: new Date('2023-01-01T01:00:00Z'),
          open: 100,
          high: 95, // Invalid: high < low
          low: 100,
          close: 105,
          volume: 1000,
          trades: 50
        }
      ];

      expect(indicator.validate(invalidData)).toBe(false);
    });

    it('should reject non-array input', () => {
      expect(indicator.validate(null as any)).toBe(false);
      expect(indicator.validate(undefined as any)).toBe(false);
      expect(indicator.validate('invalid' as any)).toBe(false);
    });
  });

  describe('calculate', () => {
    const sampleData: Kline[] = [
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
        high: 120, // Highest
        low: 90,   // Lowest
        close: 115,
        volume: 1200,
        trades: 60
      },
      {
        symbol: 'BTC/USDT',
        openTime: new Date('2023-01-01T02:00:00Z'),
        closeTime: new Date('2023-01-01T03:00:00Z'),
        open: 115,
        high: 118,
        low: 110,
        close: 112,
        volume: 800,
        trades: 40
      }
    ];

    it('should calculate high/low for standard interval', async () => {
      const config: HighLowIndicatorConfig = {
        symbol: 'BTC/USDT',
        period: '1h'
      };

      const result = await indicator.calculate(sampleData, config);

      expect(result.symbol).toBe('BTC/USDT');
      expect(result.high).toBe(120);
      expect(result.low).toBe(90);
      expect(result.range).toBe(30);
      expect(result.rangePercent).toBeCloseTo(33.33, 2);
      expect(result.calculatedAt).toBeInstanceOf(Date);
    });

    it('should calculate body high/low when useBodyHighLow is true', async () => {
      const config: HighLowIndicatorConfig = {
        symbol: 'BTC/USDT',
        period: '1h',
        useBodyHighLow: true
      };

      const result = await indicator.calculate(sampleData, config);

      expect(result.high).toBe(115); // Max of open/close values
      expect(result.low).toBe(100);  // Min of open/close values
      expect(result.range).toBe(15);
    });

    it('should handle prev_day period', async () => {
      // Create data that spans yesterday and today
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(10, 0, 0, 0); // 10 AM yesterday

      const yesterdayData: Kline[] = [
        {
          symbol: 'BTC/USDT',
          openTime: yesterday,
          closeTime: new Date(yesterday.getTime() + 3600000), // +1 hour
          open: 200,
          high: 250,
          low: 180,
          close: 220,
          volume: 1000,
          trades: 50
        }
      ];

      const config: HighLowIndicatorConfig = {
        symbol: 'BTC/USDT',
        period: 'prev_day'
      };

      const result = await indicator.calculate(yesterdayData, config);

      expect(result.high).toBe(250);
      expect(result.low).toBe(180);
    });

    it('should handle custom period', async () => {
      const customStart = new Date('2023-01-01T00:00:00Z');
      const customEnd = new Date('2023-01-01T03:00:00Z');

      const config: HighLowIndicatorConfig = {
        symbol: 'BTC/USDT',
        period: {
          type: 'custom',
          startTime: customStart,
          endTime: customEnd
        }
      };

      const result = await indicator.calculate(sampleData, config);

      expect(result.high).toBe(120);
      expect(result.low).toBe(90);
    });

    it('should handle rolling period', async () => {
      const config: HighLowIndicatorConfig = {
        symbol: 'BTC/USDT',
        period: {
          type: 'rolling',
          periods: 2,
          interval: '1h'
        }
      };

      const result = await indicator.calculate(sampleData, config);

      expect(result.high).toBe(120);
      expect(result.low).toBe(90);
    });

    it('should throw error for invalid data', async () => {
      const config: HighLowIndicatorConfig = {
        symbol: 'BTC/USDT',
        period: '1h'
      };

      await expect(indicator.calculate([], config)).rejects.toThrow('Invalid data provided');
    });

    it('should throw error when no data matches period filter', async () => {
      // Data from far in the future
      const futureData: Kline[] = [
        {
          symbol: 'BTC/USDT',
          openTime: new Date('2030-01-01T00:00:00Z'),
          closeTime: new Date('2030-01-01T01:00:00Z'),
          open: 100,
          high: 110,
          low: 95,
          close: 105,
          volume: 1000,
          trades: 50
        }
      ];

      const config: HighLowIndicatorConfig = {
        symbol: 'BTC/USDT',
        period: 'prev_day'
      };

      await expect(indicator.calculate(futureData, config)).rejects.toThrow('No data available for period');
    });

    it('should handle prev_week period correctly', async () => {
      // Create data for previous week
      const now = new Date();
      const currentDayOfWeek = now.getDay();
      const mondayOffset = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
      
      const prevWeekStart = new Date(now);
      prevWeekStart.setDate(prevWeekStart.getDate() - mondayOffset - 7);
      prevWeekStart.setHours(10, 0, 0, 0);

      const prevWeekData: Kline[] = [
        {
          symbol: 'BTC/USDT',
          openTime: prevWeekStart,
          closeTime: new Date(prevWeekStart.getTime() + 3600000),
          open: 300,
          high: 350,
          low: 280,
          close: 320,
          volume: 1000,
          trades: 50
        }
      ];

      const config: HighLowIndicatorConfig = {
        symbol: 'BTC/USDT',
        period: 'prev_week'
      };

      const result = await indicator.calculate(prevWeekData, config);

      expect(result.high).toBe(350);
      expect(result.low).toBe(280);
    });

    it('should log debug information during calculation', async () => {
      const config: HighLowIndicatorConfig = {
        symbol: 'BTC/USDT',
        period: '1h'
      };

      await indicator.calculate(sampleData, config);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'High/Low calculation completed',
        expect.objectContaining({
          symbol: 'BTC/USDT',
          period: '1h',
          dataPoints: 3,
          result: expect.objectContaining({
            high: 120,
            low: 90,
            range: 30
          })
        })
      );
    });
  });
});
