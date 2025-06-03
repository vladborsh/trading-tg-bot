import { injectable, inject } from 'inversify';
import { HealthService } from '@/domain/interfaces/health-service.interface';
import { HealthStatus, ServiceHealth } from '@/domain/interfaces/bot-service.interface';
import { Logger } from '@/utils/logger';
import { TYPES } from '@/config/types';

@injectable()
export class DefaultHealthService implements HealthService {
  private startTime: Date;

  constructor(
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.startTime = new Date();
  }

  async checkHealth(): Promise<HealthStatus> {
    const services: Record<string, ServiceHealth> = {};
    
    // Check core services
    services.logger = await this.checkLoggerHealth();
    services.memory = await this.checkMemoryHealth();
    
    const allHealthy = Object.values(services).every(service => service.status === 'healthy');
    const status = allHealthy ? 'healthy' : 'degraded';

    return {
      status,
      timestamp: new Date(),
      services,
      uptime: this.getUptime(),
    };
  }

  async checkServiceHealth(serviceName: string): Promise<boolean> {
    try {
      switch (serviceName) {
        case 'logger':
          return (await this.checkLoggerHealth()).status === 'healthy';
        case 'memory':
          return (await this.checkMemoryHealth()).status === 'healthy';
        default:
          return false;
      }
    } catch (error) {
      this.logger.error(`Health check failed for service: ${serviceName}`, error);
      return false;
    }
  }

  getUptime(): number {
    return Date.now() - this.startTime.getTime();
  }

  private async checkLoggerHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      // Test logger by writing a debug message
      this.logger.debug('Health check');
      return {
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkMemoryHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      const status = heapUsedMB < 500 ? 'healthy' : 'unhealthy'; // 500MB threshold
      
      return {
        status,
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
