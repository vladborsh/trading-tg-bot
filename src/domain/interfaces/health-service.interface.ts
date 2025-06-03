import { HealthStatus } from './bot-service.interface';

export interface HealthService {
  checkHealth(): Promise<HealthStatus>;
  checkServiceHealth(serviceName: string): Promise<boolean>;
  getUptime(): number;
}
