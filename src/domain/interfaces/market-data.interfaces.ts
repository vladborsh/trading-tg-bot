import { MarketData } from '../entities/trading.entities';

/**
 * Generic interface for market data providers
 * Supports multiple exchanges and data sources
 */
export interface MarketDataProvider {
  getName(): string;
  getMarketData(symbol: string): Promise<MarketData>;
  getKlines(symbol: string, interval: string, limit?: number): Promise<Kline[]>;
  getTicker24h(symbol: string): Promise<Ticker24h>;
  isHealthy(): Promise<boolean>;
  initialize(): Promise<void>;
  disconnect(): Promise<void>;
}

/**
 * Configuration interface for market data providers
 */
export interface MarketDataProviderConfig {
  apiKey: string;
  apiSecret: string;
  identifier?: string; // Optional for backward compatibility with other providers
  testnet?: boolean;
  rateLimitRequests?: number;
  rateLimitInterval?: number;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Order book data structure
 */
export interface OrderBook {
  symbol: string;
  timestamp: Date;
  bids: Array<[number, number]>; // [price, quantity]
  asks: Array<[number, number]>; // [price, quantity]
}

/**
 * Candlestick/Kline data structure
 */
export interface Kline {
  symbol: string;
  openTime: Date;
  closeTime: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trades: number;
}

/**
 * 24h ticker statistics
 */
export interface Ticker24h {
  symbol: string;
  priceChange: number;
  priceChangePercent: number;
  weightedAvgPrice: number;
  prevClosePrice: number;
  lastPrice: number;
  lastQty: number;
  bidPrice: number;
  askPrice: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
  openTime: Date;
  closeTime: Date;
  count: number;
}

/**
 * Market data cache interface
 */
export interface MarketDataCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Rate limiter interface for API calls
 */
export interface RateLimiter {
  checkLimit(): Promise<boolean>;
  waitForLimit(): Promise<void>;
  getRemainingRequests(): number;
  getResetTime(): Date;
}
