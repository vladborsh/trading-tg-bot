import { TokenBucketRateLimiter } from '../rate-limiter.service';

describe('TokenBucketRateLimiter', () => {
  let rateLimiter: TokenBucketRateLimiter;

  describe('basic functionality', () => {
    beforeEach(() => {
      rateLimiter = new TokenBucketRateLimiter(10, 1000); // 10 requests per second
    });

    it('should allow requests within the limit', async () => {
      expect(await rateLimiter.checkLimit()).toBe(true);
      expect(await rateLimiter.checkLimit()).toBe(true);
    });

    it('should track remaining requests correctly', async () => {
      const initial = rateLimiter.getRemainingRequests();
      expect(initial).toBe(10);

      await rateLimiter.waitForLimit(); // Consumes 1 token
      expect(rateLimiter.getRemainingRequests()).toBe(9);
    });

    it('should provide reset time', async () => {
      // When bucket is full, reset time should be current time or very close
      const resetTimeWhenFull = rateLimiter.getResetTime();
      expect(resetTimeWhenFull).toBeInstanceOf(Date);
      expect(resetTimeWhenFull.getTime()).toBeGreaterThanOrEqual(Date.now() - 1); // Allow for small timing differences

      // Consume some tokens to test reset time calculation
      await rateLimiter.waitForLimit(); // Consume 1 token
      await rateLimiter.waitForLimit(); // Consume another token
      
      const resetTimeAfterConsumption = rateLimiter.getResetTime();
      expect(resetTimeAfterConsumption).toBeInstanceOf(Date);
      expect(resetTimeAfterConsumption.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('rate limiting behavior', () => {
    beforeEach(() => {
      rateLimiter = new TokenBucketRateLimiter(3, 1000); // 3 requests per second for easier testing
    });

    it('should block when limit is exceeded', async () => {
      jest.useFakeTimers();

      // Consume all tokens
      await rateLimiter.waitForLimit(); // 2 remaining
      await rateLimiter.waitForLimit(); // 1 remaining
      await rateLimiter.waitForLimit(); // 0 remaining

      expect(rateLimiter.getRemainingRequests()).toBe(0);
      expect(await rateLimiter.checkLimit()).toBe(false);

      jest.useRealTimers();
    });

    it('should refill tokens over time', async () => {
      jest.useFakeTimers();

      // Consume all tokens
      await rateLimiter.waitForLimit();
      await rateLimiter.waitForLimit();
      await rateLimiter.waitForLimit();

      expect(rateLimiter.getRemainingRequests()).toBe(0);

      // Advance time by 1 second (should refill 3 tokens)
      jest.advanceTimersByTime(1000);

      expect(rateLimiter.getRemainingRequests()).toBe(3);
      expect(await rateLimiter.checkLimit()).toBe(true);

      jest.useRealTimers();
    });

    it('should handle partial refills correctly', async () => {
      jest.useFakeTimers();

      // Create rate limiter after setting up fake timers
      const testRateLimiter = new TokenBucketRateLimiter(3, 1000);

      // Consume all tokens
      await testRateLimiter.waitForLimit();
      await testRateLimiter.waitForLimit();
      await testRateLimiter.waitForLimit();

      expect(testRateLimiter.getRemainingRequests()).toBe(0);

      // Advance time by 500ms (should refill 1.5 tokens, rounded down to 1)
      jest.advanceTimersByTime(500);

      expect(testRateLimiter.getRemainingRequests()).toBe(1);

      jest.useRealTimers();
    });

    it('should not exceed maximum tokens', async () => {
      jest.useFakeTimers();

      // Start with full bucket, advance time significantly
      jest.advanceTimersByTime(10000); // 10 seconds

      // Should not exceed the maximum
      expect(rateLimiter.getRemainingRequests()).toBe(3);

      jest.useRealTimers();
    });
  });

  describe('waitForLimit functionality', () => {
    beforeEach(() => {
      rateLimiter = new TokenBucketRateLimiter(2, 1000); // 2 requests per second
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should resolve immediately when tokens are available', async () => {
      const promise = rateLimiter.waitForLimit();
      jest.runAllTimers();
      await promise;
      
      expect(rateLimiter.getRemainingRequests()).toBe(1);
    });

    it('should wait when no tokens are available', async () => {
      // Consume all tokens
      await rateLimiter.waitForLimit();
      await rateLimiter.waitForLimit();
      
      expect(rateLimiter.getRemainingRequests()).toBe(0);

      // Start waiting for the next token
      const waitPromise = rateLimiter.waitForLimit();
      
      // Advance time and handle async operations properly
      await jest.advanceTimersByTimeAsync(1000);
      
      await waitPromise;
      
      // Should have consumed one of the refilled tokens
      expect(rateLimiter.getRemainingRequests()).toBe(1);
    }, 10000); // Increase timeout just in case
  });

  describe('edge cases', () => {
    it('should handle zero rate limit gracefully', async () => {
      rateLimiter = new TokenBucketRateLimiter(0, 1000);
      
      expect(await rateLimiter.checkLimit()).toBe(false);
      expect(rateLimiter.getRemainingRequests()).toBe(0);
    });

    it('should handle very high rate limits', async () => {
      rateLimiter = new TokenBucketRateLimiter(10000, 1000);
      
      expect(await rateLimiter.checkLimit()).toBe(true);
      expect(rateLimiter.getRemainingRequests()).toBe(10000);
    });

    it('should handle very small time windows', async () => {
      rateLimiter = new TokenBucketRateLimiter(1, 100); // 1 request per 100ms
      
      expect(await rateLimiter.checkLimit()).toBe(true);
      await rateLimiter.waitForLimit();
      expect(await rateLimiter.checkLimit()).toBe(false);
    });
  });

  describe('default configuration', () => {
    it('should use Binance defaults when no parameters provided', async () => {
      rateLimiter = new TokenBucketRateLimiter(); // Default: 1200 requests per minute
      
      expect(rateLimiter.getRemainingRequests()).toBe(1200);
      expect(await rateLimiter.checkLimit()).toBe(true);
    });
  });

  describe('concurrent access', () => {
    beforeEach(() => {
      rateLimiter = new TokenBucketRateLimiter(5, 1000);
    });

    it('should handle multiple concurrent waitForLimit calls', async () => {
      // Create multiple promises that will wait for limit
      const promises = Array(10).fill(null).map(() => rateLimiter.waitForLimit());

      // All should eventually resolve (some will wait for refill)
      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      
      // After all operations, remaining should be negative or zero
      expect(rateLimiter.getRemainingRequests()).toBeLessThanOrEqual(0);
    });
  });
});
