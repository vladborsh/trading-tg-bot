import 'reflect-metadata';
import { Container } from 'inversify';
import { config } from '@/config/environment';
import { Logger } from '@/utils/logger';
import { BotService } from '@/domain/interfaces/bot-service.interface';
import { MarketDataProvider } from '@/domain/interfaces/market-data.interfaces';
import { TYPES } from '@/config/types';
import { setupContainer } from '@/config/inversify.config';

class Application {
  private container: Container;
  private logger: Logger;
  private marketDataProvider: MarketDataProvider;

  constructor() {
    this.container = setupContainer();
    this.logger = this.container.get<Logger>(TYPES.Logger);
    this.marketDataProvider = this.container.get<MarketDataProvider>(TYPES.BinanceProvider);
  }

  public async start(): Promise<void> {
    try {
      this.logger.info('Starting Trading Bot Application', {
        version: process.env.npm_package_version,
        environment: config.NODE_ENV,
      });

      // Initialize market data provider
      await this.marketDataProvider.initialize();
      const isHealthy = await this.marketDataProvider.isHealthy();
      this.logger.info('Market data provider health check', { isHealthy });
      
      if (!isHealthy) {
        throw new Error('Market data provider is not healthy');
      }

      const botService = this.container.get<BotService>(TYPES.BotService);
      await botService.initialize();
      await botService.startBackgroundTasks();

      this.logger.info('Trading Bot Application started successfully');

      // Graceful shutdown
      process.on('SIGINT', () => this.shutdown());
      process.on('SIGTERM', () => this.shutdown());
    } catch (error) {
      this.logger.error('Failed to start application', error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    this.logger.info('Shutting down Trading Bot Application');
    if (this.marketDataProvider) {
      await this.marketDataProvider.disconnect();
    }
    process.exit(0);
  }
}

// Start the application
const app = new Application();
app.start().catch((error) => {
  console.error('Unhandled error during application startup:', error);
  process.exit(1);
});
