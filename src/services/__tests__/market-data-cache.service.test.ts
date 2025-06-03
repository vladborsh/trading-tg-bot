import { InMemoryMarketDataCache } from '../market-data-cache.service';

describe('InMemoryMarketDataCache', () => {
  let cache: InMemoryMarketDataCache;

  beforeEach(() => {
    cache = new InMemoryMarketDataCache();
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('basic operations', () => {
    it('should set and get values', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };

      await cache.set(key, value);
      const result = await cache.get(key);

      expect(result).toEqual(value);
    });

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should delete values', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };

      await cache.set(key, value);
      await cache.delete(key);
      const result = await cache.get(key);

      expect(result).toBeNull();
    });

    it('should clear all values', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      
      await cache.clear();
      
      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
    });
  });

  describe('TTL functionality', () => {
    it('should expire values after TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };
      const ttl = 100; // 100ms

      await cache.set(key, value, ttl);
      
      // Should exist immediately
      expect(await cache.get(key)).toEqual(value);
      
      // Should expire after TTL
      await new Promise(resolve => setTimeout(resolve, ttl + 50));
      expect(await cache.get(key)).toBeNull();
    });

    it('should use default TTL when not specified', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };

      await cache.set(key, value); // Uses default TTL (60s)
      
      // Should exist immediately
      expect(await cache.get(key)).toEqual(value);
    });

    it('should handle different data types', async () => {
      await cache.set('string', 'test');
      await cache.set('number', 42);
      await cache.set('boolean', true);
      await cache.set('object', { nested: { value: 'test' } });
      await cache.set('array', [1, 2, 3]);

      expect(await cache.get('string')).toBe('test');
      expect(await cache.get('number')).toBe(42);
      expect(await cache.get('boolean')).toBe(true);
      expect(await cache.get('object')).toEqual({ nested: { value: 'test' } });
      expect(await cache.get('array')).toEqual([1, 2, 3]);
    });
  });

  describe('cleanup functionality', () => {
    it('should automatically clean up expired items', async () => {
      // Mock timers to control cleanup interval
      jest.useFakeTimers();

      const cache = new InMemoryMarketDataCache();
      
      await cache.set('short-lived', 'value', 10); // 10ms TTL
      await cache.set('long-lived', 'value', 60000); // 60s TTL

      // Fast-forward past the first item's TTL
      jest.advanceTimersByTime(50);

      // Trigger cleanup by advancing to cleanup interval
      jest.advanceTimersByTime(30000);

      // The short-lived item should be cleaned up, long-lived should remain
      expect(await cache.get('short-lived')).toBeNull();
      expect(await cache.get('long-lived')).toBe('value');

      cache.destroy();
      jest.useRealTimers();
    });
  });

  describe('memory management', () => {
    it('should handle large numbers of items', async () => {
      const itemCount = 1000;
      
      // Set many items
      for (let i = 0; i < itemCount; i++) {
        await cache.set(`key-${i}`, `value-${i}`);
      }

      // Verify all items exist
      for (let i = 0; i < itemCount; i++) {
        expect(await cache.get(`key-${i}`)).toBe(`value-${i}`);
      }
    });

    it('should properly destroy and clean up resources', () => {
      const cache = new InMemoryMarketDataCache();
      
      // Should not throw when destroying
      expect(() => cache.destroy()).not.toThrow();
      
      // Should be safe to call destroy multiple times
      expect(() => cache.destroy()).not.toThrow();
    });
  });
});
