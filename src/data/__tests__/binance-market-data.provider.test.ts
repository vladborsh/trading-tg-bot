import 'reflect-metadata';
import { BinanceMarketDataProvider } from '../binance-market-data.provider';
import { MarketDataCache, RateLimiter } from '../../domain/interfaces/market-data.interfaces';
import { Logger } from 'winston';

// Mock CCXT
jest.mock('ccxt', () => ({
  binance: jest.fn().mockImplementation(() => ({
    loadMarkets: jest.fn().mockResolvedValue({}),
    fetchStatus: jest.fn().mockResolvedValue({ status: 'ok' }),
    fetchTicker: jest.fn().mockResolvedValue({
      symbol: 'BTC/USDT',
      last: 50000,
      baseVolume: 1000,
      timestamp: Date.now(),
      change: 1000,
      percentage: 2.0,
      bid: 49950,
      ask: 50050,
      open: 49000,
      high: 51000,
      low: 48000,
      close: 50000,
      vwap: 49500,
      quoteVolume: 50000000
    }),
    fetchOrderBook: jest.fn().mockResolvedValue({
      symbol: 'BTC/USDT',
      timestamp: Date.now(),
      bids: [[49950, 1.5], [49900, 2.0]],
      asks: [[50050, 1.2], [50100, 1.8]]
    }),
    fetchOHLCV: jest.fn().mockResolvedValue([
      [Date.now() - 60000, 49000, 49500, 48500, 49200, 100],
      [Date.now(), 49200, 49800, 49100, 49600, 150]
    ]),
    close: jest.fn().mockResolvedValue(undefined)
  }))
}));

describe('BinanceMarketDataProvider', () => {
  let provider: BinanceMarketDataProvider;
  let mockLogger: jest.Mocked<Logger>;
  let mockCache: jest.Mocked<MarketDataCache>;
  let mockRateLimiter: jest.Mocked<RateLimiter>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as any;

    mockCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined)
    };

    mockRateLimiter = {
      checkLimit: jest.fn().mockResolvedValue(true),
      waitForLimit: jest.fn().mockResolvedValue(undefined),
      getRemainingRequests: jest.fn().mockReturnValue(1000),
      getResetTime: jest.fn().mockReturnValue(new Date())
    };

    provider = new BinanceMarketDataProvider(
      mockLogger,
      mockCache,
      mockRateLimiter,
      { testnet: true }
    );
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await provider.initialize();
      expect(mockLogger.info).toHaveBeenCalledWith('Initializing Binance market data provider');
      expect(mockLogger.info).toHaveBeenCalledWith('Binance market data provider initialized successfully');
    });

    it('should return correct provider name', () => {
      expect(provider.getName()).toBe('Binance');
    });
  });

  describe('getMarketData', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    it('should fetch market data successfully', async () => {
      const symbol = 'BTC/USDT';
      const marketData = await provider.getMarketData(symbol);

      expect(marketData).toEqual({
        symbol: 'BTC/USDT',
        price: 50000,
        volume: 1000,
        timestamp: expect.any(Date),
        change24h: 1000,
        changePercent24h: 2.0
      });

      expect(mockRateLimiter.waitForLimit).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalledWith(
        'market_data_BTC/USDT',
        expect.any(Object),
        5000
      );
    });

    it('should return cached data when available', async () => {
      const cachedData = {
        symbol: 'BTC/USDT',
        price: 49000,
        volume: 900,
        timestamp: new Date(),
        change24h: 500,
        changePercent24h: 1.0
      };

      mockCache.get.mockResolvedValueOnce(cachedData);

      const result = await provider.getMarketData('BTC/USDT');

      expect(result).toBe(cachedData);
      expect(mockRateLimiter.waitForLimit).not.toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully', async () => {
      // Make sure cache is empty for this test
      mockCache.get.mockResolvedValueOnce(null);
      
      // Mock the provider's actual exchange instance to always reject
      const mockExchange = (provider as any).exchange;
      mockExchange.fetchTicker.mockRejectedValue(new Error('Network error'));

      await expect(provider.getMarketData('BTC/USDT')).rejects.toThrow(
        'Failed to fetch market data for BTC/USDT: Error: Network error'
      );
    });
  });

  describe('getMultipleMarketData', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    it('should fetch multiple market data successfully', async () => {
      const symbols = ['BTC/USDT', 'ETH/USDT'];
      const results = await provider.getMultipleMarketData(symbols);

      expect(results).toHaveLength(2);
      expect(results[0].symbol).toBe('BTC/USDT');
      expect(results[1].symbol).toBe('BTC/USDT'); // Mocked to return same data
    });

    it('should handle partial failures gracefully', async () => {
      // Mock the provider's actual exchange instance
      const mockExchange = (provider as any).exchange;
      
      // Clear any existing mock implementation
      mockExchange.fetchTicker.mockReset();
      
      // Set up the mock to succeed for BTC/USDT and fail for INVALID/SYMBOL
      mockExchange.fetchTicker.mockImplementation((symbol: string) => {
        if (symbol === 'BTC/USDT') {
          return Promise.resolve({
            symbol: 'BTC/USDT',
            last: 50000,
            baseVolume: 1000,
            timestamp: Date.now(),
            change: 1000,
            percentage: 2.0
          });
        }
        // For any other symbol including INVALID/SYMBOL, reject with error
        return Promise.reject(new Error('Symbol not found'));
      });

      const symbols = ['BTC/USDT', 'INVALID/SYMBOL'];
      const results = await provider.getMultipleMarketData(symbols);

      expect(results).toHaveLength(1);
      expect(results[0].symbol).toBe('BTC/USDT');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to fetch data for symbol',
        expect.objectContaining({ symbol: 'INVALID/SYMBOL' })
      );
    });
  });

  describe('getOrderBook', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    it('should fetch order book successfully', async () => {
      const orderBook = await provider.getOrderBook('BTC/USDT', 10);

      expect(orderBook).toEqual({
        symbol: 'BTC/USDT',
        timestamp: expect.any(Date),
        bids: [[49950, 1.5], [49900, 2.0]],
        asks: [[50050, 1.2], [50100, 1.8]]
      });

      expect(mockRateLimiter.waitForLimit).toHaveBeenCalled();
    });
  });

  describe('getKlines', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    it('should fetch klines successfully', async () => {
      const klines = await provider.getKlines('BTC/USDT', '1m', 2);

      expect(klines).toHaveLength(2);
      expect(klines[0]).toEqual({
        symbol: 'BTC/USDT',
        openTime: expect.any(Date),
        closeTime: expect.any(Date),
        open: 49000,
        high: 49500,
        low: 48500,
        close: 49200,
        volume: 100,
        trades: 0
      });

      expect(mockRateLimiter.waitForLimit).toHaveBeenCalled();
    });
  });

  describe('getTicker24h', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    it('should fetch 24h ticker successfully', async () => {
      const ticker = await provider.getTicker24h('BTC/USDT');

      expect(ticker).toEqual({
        symbol: 'BTC/USDT',
        priceChange: 1000,
        priceChangePercent: 2.0,
        weightedAvgPrice: 49500,
        prevClosePrice: 50000,
        lastPrice: 50000,
        lastQty: 0,
        bidPrice: 49950,
        askPrice: 50050,
        openPrice: 49000,
        highPrice: 51000,
        lowPrice: 48000,
        volume: 1000,
        quoteVolume: 50000000,
        openTime: expect.any(Date),
        closeTime: expect.any(Date),
        count: 0
      });
    });
  });

  describe('isHealthy', () => {
    it('should return false when not initialized', async () => {
      const health = await provider.isHealthy();
      expect(health).toBe(false);
    });

    it('should return true when initialized and status is ok', async () => {
      await provider.initialize();
      const health = await provider.isHealthy();
      expect(health).toBe(true);
    });

    it('should return false when status check fails', async () => {
      await provider.initialize();
      
      // Mock the provider's actual exchange instance
      const mockExchange = (provider as any).exchange;
      mockExchange.fetchStatus.mockRejectedValueOnce(new Error('Connection failed'));

      const health = await provider.isHealthy();
      expect(health).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Binance health check failed',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      await provider.initialize();
      await provider.disconnect();

      expect(mockLogger.info).toHaveBeenCalledWith('Binance market data provider disconnected');
    });
  });

  describe('retry mechanism', () => {
    beforeEach(async () => {
      await provider.initialize();
      // Clear previous mock calls
      mockLogger.warn.mockClear();
    });

    it('should retry failed operations', async () => {
      // Mock the provider's actual exchange instance
      const mockExchange = (provider as any).exchange;
      
      // Mock to fail twice then succeed
      mockExchange.fetchTicker
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({
          symbol: 'BTC/USDT',
          last: 50000,
          baseVolume: 1000,
          timestamp: Date.now(),
          change: 1000,
          percentage: 2.0
        });

      const result = await provider.getMarketData('BTC/USDT');

      expect(result.price).toBe(50000);
      expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retry attempts', async () => {
      // Mock the provider's actual exchange instance
      const mockExchange = (provider as any).exchange;
      
      mockExchange.fetchTicker.mockRejectedValue(new Error('Persistent error'));

      await expect(provider.getMarketData('BTC/USDT')).rejects.toThrow('Persistent error');
      expect(mockLogger.warn).toHaveBeenCalledTimes(2); // 3 attempts - 1 = 2 warnings
    });
  });
});
