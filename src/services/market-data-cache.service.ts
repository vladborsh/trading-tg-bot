import { injectable } from 'inversify';
import { MarketDataCache } from '../domain/interfaces/market-data.interfaces';
import { TIME_CONSTANTS, CACHE_CONSTANTS } from '../config/constants';

interface CacheItem<T> {
  value: T;
  expiry: number;
}

@injectable()
export class InMemoryMarketDataCache implements MarketDataCache {
  private cache = new Map<string, CacheItem<any>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired items at regular intervals
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, CACHE_CONSTANTS.CLEANUP_INTERVAL);
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value as T;
  }

  async set<T>(key: string, value: T, ttl = CACHE_CONSTANTS.DEFAULT_TTL): Promise<void> {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}
