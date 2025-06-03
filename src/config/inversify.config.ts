import { Container } from 'inversify';
import { TYPES } from './types';

// Services
import { BotService } from '../domain/interfaces/bot-service.interface';
import { TelegramBotService } from '../bot/telegram-bot.service';
import { Logger } from '../utils/logger';
import { WinstonLogger } from '../utils/winston-logger';
import { HealthService } from '../domain/interfaces/health-service.interface';
import { DefaultHealthService } from '../services/health.service';

// Market Data
import { MarketDataProvider, MarketDataCache, RateLimiter } from '../domain/interfaces/market-data.interfaces';
import { BinanceMarketDataProvider } from '../data/binance-market-data.provider';
import { InMemoryMarketDataCache } from '../services/market-data-cache.service';
import { TokenBucketRateLimiter } from '../services/rate-limiter.service';

export function setupContainer(): Container {
  const container = new Container();

  // Core Services
  container.bind<Logger>(TYPES.Logger).to(WinstonLogger).inSingletonScope();
  container.bind<BotService>(TYPES.BotService).to(TelegramBotService).inSingletonScope();
  container.bind<HealthService>(TYPES.HealthService).to(DefaultHealthService).inSingletonScope();

  // Market Data Services
  container.bind<MarketDataCache>(TYPES.MarketDataCache).to(InMemoryMarketDataCache).inSingletonScope();
  container.bind<RateLimiter>(TYPES.RateLimiter).to(TokenBucketRateLimiter).inSingletonScope();
  container.bind<MarketDataProvider>(TYPES.BinanceProvider).to(BinanceMarketDataProvider).inSingletonScope();

  return container;
}
