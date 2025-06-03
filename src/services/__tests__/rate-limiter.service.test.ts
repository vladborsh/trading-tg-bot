import { TokenBucketRateLimiter } from '../rate-limiter.service';
import { Logger } from '../../utils/logger';
import { TIME_CONSTANTS, RATE_LIMIT_CONSTANTS } from '../../config/constants';

describe('TokenBucketRateLimiter', () => {
  let rateLimiter: TokenBucketRateLimiter;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as any;

    rateLimiter = new TokenBucketRateLimiter(mockLogger);
  });

  describe('basic functionality', () => {
    it('should allow requests within the limit', async () => {
      expect(await rateLimiter.checkLimit()).toBe(true);
      expect(await rateLimiter.checkLimit()).toBe(true);
    });

    it('should track remaining requests correctly', async () => {
      const initial = rateLimiter.getRemainingRequests();
      expect(initial).toBe(RATE_LIMIT_CONSTANTS.DEFAULT_REQUESTS_PER_MINUTE);

      await rateLimiter.waitForLimit(); // Consumes 1 token
      expect(rateLimiter.getRemainingRequests()).toBe(RATE_LIMIT_CONSTANTS.DEFAULT_REQUESTS_PER_MINUTE - 1);
    });

    it('should provide reset time', async () => {
      // When bucket is full, reset time should be current time or very close (within 5ms tolerance)
      const resetTimeWhenFull = rateLimiter.getResetTime();
      expect(resetTimeWhenFull).toBeInstanceOf(Date);
      const now = Date.now();
      expect(resetTimeWhenFull.getTime()).toBeGreaterThanOrEqual(now - 5); // Allow for small timing differences
      expect(resetTimeWhenFull.getTime()).toBeLessThanOrEqual(now + 5); // Ensure it's not too far in the future

      // Consume some tokens to test reset time calculation
      await rateLimiter.waitForLimit(); // Consume 1 token
      await rateLimiter.waitForLimit(); // Consume another token
      
      const resetTimeAfterConsumption = rateLimiter.getResetTime();
      expect(resetTimeAfterConsumption).toBeInstanceOf(Date);
      expect(resetTimeAfterConsumption.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('rate limiting behavior', () => {
    it('should block when limit is exceeded', async () => {
      jest.useFakeTimers();

      // Consume all tokens
      const totalTokens = RATE_LIMIT_CONSTANTS.DEFAULT_REQUESTS_PER_MINUTE;
      for (let i = 0; i < totalTokens; i++) {
        await rateLimiter.waitForLimit();
      }

      expect(rateLimiter.getRemainingRequests()).toBe(0);
      expect(await rateLimiter.checkLimit()).toBe(false);

      jest.useRealTimers();
    });

    it('should refill tokens over time', async () => {
      jest.useFakeTimers();

      // Consume some tokens
      for (let i = 0; i < 10; i++) {
        await rateLimiter.waitForLimit();
      }

      const remainingBefore = rateLimiter.getRemainingRequests();

      // Advance time by 1 second
      jest.advanceTimersByTime(1000);

      const remainingAfter = rateLimiter.getRemainingRequests();
      expect(remainingAfter).toBeGreaterThan(remainingBefore);

      jest.useRealTimers();
    });

    it('should handle partial refills correctly', async () => {
      jest.useFakeTimers();

      // Consume all tokens
      const totalTokens = RATE_LIMIT_CONSTANTS.DEFAULT_REQUESTS_PER_MINUTE;
      for (let i = 0; i < totalTokens; i++) {
        await rateLimiter.waitForLimit();
      }

      expect(rateLimiter.getRemainingRequests()).toBe(0);

      // Advance time by half the window
      jest.advanceTimersByTime(TIME_CONSTANTS.MINUTE / 2);

      // Should have refilled approximately half the tokens
      const remaining = rateLimiter.getRemainingRequests();
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThan(totalTokens);

      jest.useRealTimers();
    });
  });

  describe('waitForLimit functionality', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should resolve immediately when tokens are available', async () => {
      const promise = rateLimiter.waitForLimit();
      jest.runAllTimers();
      await promise;
      
      expect(rateLimiter.getRemainingRequests()).toBe(RATE_LIMIT_CONSTANTS.DEFAULT_REQUESTS_PER_MINUTE - 1);
    });

    it('should wait when no tokens are available', async () => {
      // Consume all tokens
      const totalTokens = RATE_LIMIT_CONSTANTS.DEFAULT_REQUESTS_PER_MINUTE;
      for (let i = 0; i < totalTokens; i++) {
        await rateLimiter.waitForLimit();
      }
      
      expect(rateLimiter.getRemainingRequests()).toBe(0);

      // Start waiting for the next token
      const waitPromise = rateLimiter.waitForLimit();
      
      // Advance time and handle async operations properly
      await jest.advanceTimersByTimeAsync(TIME_CONSTANTS.MINUTE);
      
      await waitPromise;
      
      // Should have consumed one of the refilled tokens
      expect(rateLimiter.getRemainingRequests()).toBe(RATE_LIMIT_CONSTANTS.DEFAULT_REQUESTS_PER_MINUTE - 1);
    });
  });

  describe('default configuration', () => {
    it('should use default values when initialized', async () => {
      rateLimiter = new TokenBucketRateLimiter(mockLogger);
      
      expect(rateLimiter.getRemainingRequests()).toBe(RATE_LIMIT_CONSTANTS.DEFAULT_REQUESTS_PER_MINUTE);
      expect(await rateLimiter.checkLimit()).toBe(true);
    });
  });
});
