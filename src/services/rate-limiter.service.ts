import { injectable, inject } from 'inversify';
import { RateLimiter } from '../domain/interfaces/market-data.interfaces';
import { TYPES } from '../config/types';
import { TIME_CONSTANTS, RATE_LIMIT_CONSTANTS } from '../config/constants';
import { Logger } from '../utils/logger';

@injectable()
export class TokenBucketRateLimiter implements RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number = RATE_LIMIT_CONSTANTS.DEFAULT_REQUESTS_PER_MINUTE;
  private readonly windowMs: number = TIME_CONSTANTS.MINUTE;
  private readonly waitInterval: number = RATE_LIMIT_CONSTANTS.DEFAULT_WAIT_INTERVAL;
  private readonly refillRate: number;

  constructor(@inject(TYPES.Logger) private logger: Logger) {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
    this.refillRate = this.maxTokens / (this.windowMs / 1000); // tokens per second
    this.logger.info('Rate limiter initialized', {
      maxTokens: this.maxTokens,
      refillRate: this.refillRate,
      waitInterval: this.waitInterval
    });
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
        this.logger.warn('waitForLimit stuck in loop', {
          tokens: this.tokens,
          refillRate: this.refillRate,
          iterations
        });
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
    this.refillTokens();
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
      this.logger.warn('Time went backwards, resetting lastRefill', {
        now,
        lastRefill: this.lastRefill,
        timePassed
      });
      this.lastRefill = now;
    }
  }
}
