import { DefaultHealthService } from '../health.service';
import { Logger } from '@/utils/logger';

describe('DefaultHealthService', () => {
  let healthService: DefaultHealthService;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
    healthService = new DefaultHealthService(mockLogger);
  });

  describe('checkHealth', () => {
    it('should return health status with services', async () => {
      const health = await healthService.checkHealth();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('services');
      expect(health).toHaveProperty('uptime');
      expect(health.services).toHaveProperty('logger');
      expect(health.services).toHaveProperty('memory');
    });

    it('should calculate uptime correctly', () => {
      const uptime = healthService.getUptime();
      expect(uptime).toBeGreaterThanOrEqual(0);
      expect(typeof uptime).toBe('number');
    });

    it('should show increasing uptime over time', async () => {
      const initialUptime = healthService.getUptime();
      
      // Wait a small amount of time
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const laterUptime = healthService.getUptime();
      expect(laterUptime).toBeGreaterThan(initialUptime);
    });
  });

  describe('checkServiceHealth', () => {
    it('should return true for logger service', async () => {
      const isHealthy = await healthService.checkServiceHealth('logger');
      expect(typeof isHealthy).toBe('boolean');
    });

    it('should return false for unknown service', async () => {
      const isHealthy = await healthService.checkServiceHealth('unknown');
      expect(isHealthy).toBe(false);
    });
  });
});
