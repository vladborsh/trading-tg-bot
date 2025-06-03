export interface TelegramContext {
  chatId: string;
  userId: string;
  messageId: number;
  text?: string | undefined;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  services: Record<string, ServiceHealth>;
  uptime: number;
}

export interface ServiceHealth {
  status: 'healthy' | 'unhealthy';
  lastCheck: Date;
  responseTime?: number;
  error?: string;
}

export interface BotService {
  initialize(): Promise<void>;
  handleCommand(command: string, context: TelegramContext): Promise<void>;
  startBackgroundTasks(): Promise<void>;
  getHealthStatus(): Promise<HealthStatus>;
}
