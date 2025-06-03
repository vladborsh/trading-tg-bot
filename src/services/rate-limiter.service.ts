import { injectable } from 'inversify';
import { RateLimiter } from '../domain/interfaces/market-data.interfaces';

@injectable()
export class TokenBucketRateLimiter implements RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second
  private readonly waitInterval: number;

  constructor(
    maxRequests = 1200, // Binance spot API limit
    windowMs = 60000, // 1 minute window
    waitInterval = 100 // Wait interval for polling in ms
  ) {
    this.maxTokens = maxRequests;
    this.refillRate = maxRequests / (windowMs / 1000); // tokens per second
    this.tokens = maxRequests;
    this.lastRefill = Date.now();
    this.waitInterval = waitInterval;
  }

  async checkLimit(): Promise<boolean> {
    this.refillTokens();
    return this.tokens >= 1;
  }

  async waitForLimit(): Promise<void> {
    let iterations = 0;
    while (!(await this.checkLimit())) {
      iterations++;
      if (iterations > 100) {
        console.log('waitForLimit stuck in loop. Current tokens:', this.tokens, 'Refill rate:', this.refillRate);
        break; // Prevent infinite loop
      }
      // Wait for next refill
      await this.delay(this.waitInterval);
    }
    
    // Consume one token
    this.tokens = Math.max(0, this.tokens - 1);
  }

  getRemainingRequests(): number {
    this.refillTokens();
    return Math.floor(this.tokens);
  }

  getResetTime(): Date {
    const timeToFullRefill = (this.maxTokens - this.tokens) / this.refillRate * 1000;
    return new Date(Date.now() + timeToFullRefill);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    
    // Handle edge case where time might go backwards (e.g., during testing)
    if (timePassed > 0) {
      const tokensToAdd = (timePassed / 1000) * this.refillRate;
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    } else if (timePassed < 0) {
      // Time went backwards, reset lastRefill to now
      this.lastRefill = now;
    }
  }
}
