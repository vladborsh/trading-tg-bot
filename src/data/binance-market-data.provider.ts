import { injectable, inject } from 'inversify';
import * as ccxt from 'ccxt';
import { MarketData } from '../domain/entities/trading.entities';
import { 
  MarketDataProvider, 
  MarketDataProviderConfig,
  Kline, 
  Ticker24h,
  RateLimiter
} from '../domain/interfaces/market-data.interfaces';
import { TYPES } from '../config/types';
import { Logger } from '@/utils/logger';
import { TIME_CONSTANTS, RATE_LIMIT_CONSTANTS } from '../config/constants';
import { getIntervalMs, getIntervalStartTime, getIntervalEndTime } from '../utils/time-utils';

@injectable()
export class BinanceMarketDataProvider implements MarketDataProvider {
  private exchange: ccxt.binance;
  private isInitialized = false;
  private readonly config: MarketDataProviderConfig;

  constructor(
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.RateLimiter) private rateLimiter: RateLimiter
  ) {
    this.config = {
      testnet: false,
      rateLimitRequests: RATE_LIMIT_CONSTANTS.DEFAULT_REQUESTS_PER_MINUTE,
      rateLimitInterval: RATE_LIMIT_CONSTANTS.DEFAULT_INTERVAL,
      timeout: TIME_CONSTANTS.DEFAULT_REQUEST_TIMEOUT,
      retryAttempts: RATE_LIMIT_CONSTANTS.DEFAULT_RETRY_ATTEMPTS,
      retryDelay: TIME_CONSTANTS.DEFAULT_RETRY_DELAY
    };

    const exchangeConfig: any = {
      rateLimit: (this.config.rateLimitInterval || 60000) / (this.config.rateLimitRequests || 1200),
      enableRateLimit: true,
    };

    if (this.config.apiKey) {
      exchangeConfig.apiKey = this.config.apiKey;
    }
    if (this.config.apiSecret) {
      exchangeConfig.secret = this.config.apiSecret;
    }
    if (this.config.timeout) {
      exchangeConfig.timeout = this.config.timeout;
    }
    if (this.config.testnet !== undefined) {
      exchangeConfig.sandbox = this.config.testnet;
    }

    this.exchange = new ccxt.binance(exchangeConfig);
  }

  getName(): string {
    return 'Binance';
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Binance market data provider');
      
      // Load markets
      await this.exchange.loadMarkets();
      
      // Test connection
      await this.exchange.fetchStatus();
      
      this.isInitialized = true;
      this.logger.info('Binance market data provider initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Binance provider', { error });
      throw new Error(`Failed to initialize Binance provider: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.exchange) {
      await this.exchange.close();
      this.isInitialized = false;
      this.logger.info('Binance market data provider disconnected');
    }
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    await this.ensureInitialized();
    await this.rateLimiter.waitForLimit();

    try {
      const ticker = await this.retryOperation(() => 
        this.exchange.fetchTicker(symbol)
      );

      const marketData: MarketData = {
        symbol: ticker.symbol,
        price: ticker.last || 0,
        volume: ticker.baseVolume || 0,
        timestamp: new Date(ticker.timestamp || Date.now()),
        ...(ticker.change !== null && ticker.change !== undefined && { change24h: ticker.change }),
        ...(ticker.percentage !== null && ticker.percentage !== undefined && { changePercent24h: ticker.percentage })
      };
      
      return marketData;
    } catch (error) {
      this.logger.error('Failed to fetch market data from Binance', { symbol, error });
      throw new Error(`Failed to fetch market data for ${symbol}: ${error}`);
    }
  }

  async getKlines(symbol: string, interval: string, limit = 500): Promise<Kline[]> {
    await this.ensureInitialized();
    await this.rateLimiter.waitForLimit();

    try {
      const ohlcv = await this.retryOperation(() =>
        this.exchange.fetchOHLCV(symbol, interval, undefined, limit)
      );

      return ohlcv.map(candle => {
        const timestamp = candle[0] as number;
        return {
          symbol,
          openTime: getIntervalStartTime(timestamp, interval),
          closeTime: getIntervalEndTime(timestamp, interval),
          open: candle[1] as number,
          high: candle[2] as number,
          low: candle[3] as number,
          close: candle[4] as number,
          volume: candle[5] as number,
          trades: 0 // CCXT doesn't provide trade count in OHLCV
        };
      });
    } catch (error) {
      this.logger.error('Failed to fetch klines from Binance', { symbol, interval, error });
      throw new Error(`Failed to fetch klines for ${symbol}: ${error}`);
    }
  }

  async getTicker24h(symbol: string): Promise<Ticker24h> {
    await this.ensureInitialized();
    await this.rateLimiter.waitForLimit();

    try {
      const ticker = await this.retryOperation(() =>
        this.exchange.fetchTicker(symbol)
      );

      return {
        symbol: ticker.symbol,
        priceChange: ticker.change || 0,
        priceChangePercent: ticker.percentage || 0,
        weightedAvgPrice: ticker.vwap || ticker.last || 0,
        prevClosePrice: ticker.close || 0,
        lastPrice: ticker.last || 0,
        lastQty: 0, // Not available in CCXT
        bidPrice: ticker.bid || 0,
        askPrice: ticker.ask || 0,
        openPrice: ticker.open || 0,
        highPrice: ticker.high || 0,
        lowPrice: ticker.low || 0,
        volume: ticker.baseVolume || 0,
        quoteVolume: ticker.quoteVolume || 0,
        openTime: new Date(ticker.timestamp || Date.now()),
        closeTime: new Date(ticker.timestamp || Date.now()),
        count: 0 // Not available in CCXT
      };
    } catch (error) {
      this.logger.error('Failed to fetch 24h ticker from Binance', { symbol, error });
      throw new Error(`Failed to fetch 24h ticker for ${symbol}: ${error}`);
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return false;
      }

      const status = await this.exchange.fetchStatus();
      return status.status === 'ok';
    } catch (error) {
      this.logger.warn('Binance health check failed', { error });
      return false;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts!; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.config.retryAttempts) {
          throw lastError;
        }
        
        this.logger.warn('Operation failed, retrying', { 
          attempt, 
          maxAttempts: this.config.retryAttempts,
          error: lastError.message 
        });
        
        await new Promise(resolve => 
          setTimeout(resolve, this.config.retryDelay! * attempt)
        );
      }
    }
    
    throw lastError!;
  }

  // Using utility function instead of internal implementation
  private getIntervalMs(interval: string): number {
    return getIntervalMs(interval);
  }
}
