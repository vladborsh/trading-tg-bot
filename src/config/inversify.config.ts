import { Container } from 'inversify';
import { TYPES } from './types';
import { TIME_CONSTANTS, RATE_LIMIT_CONSTANTS } from './constants';

// Services
import { BotService } from '../domain/interfaces/bot-service.interface';
import { TelegramBotService } from '../bot/telegram-bot.service';
import { Logger } from '../utils/logger';
import { WinstonLogger } from '../utils/winston-logger';
import { HealthService } from '../domain/interfaces/health-service.interface';
import { DefaultHealthService } from '../services/health.service';

// Market Data
import { MarketDataProvider, MarketDataCache, RateLimiter, MarketDataProviderConfig } from '../domain/interfaces/market-data.interfaces';
import { BinanceMarketDataProvider } from '../data/binance-market-data.provider';
import { CapitalComMarketDataProvider } from '../data/capitalcom-market-data.provider';
import { InMemoryMarketDataCache } from '../services/market-data-cache.service';
import { TokenBucketRateLimiter } from '../services/rate-limiter.service';

// Indicators
import { HighLowIndicator } from '../core/indicators/high-low.indicator';
import { HighLowIndicatorInterface } from '../core/indicators/indicator.interfaces';

// Strategies
import { CorrelationCrackStrategy } from '../core/strategies/correlation-crack.strategy';
import { CorrelationCrackStrategyInterface } from '../core/strategies/strategy.interfaces';

// Bot Services
import { MessageFormatterService } from '../bot/message-formatter.service';
import { CorrelationConfigurationService } from '../bot/correlation-configuration.service';
import { CorrelationStrategyRunnerService, CorrelationStrategyRunnerServiceImpl } from '../bot/correlation-strategy-runner.service';

export function setupContainer(): Container {
  const container = new Container();

  // Core Services
  container.bind<Logger>(TYPES.Logger).to(WinstonLogger).inSingletonScope();
  container.bind<BotService>(TYPES.BotService).to(TelegramBotService).inSingletonScope();
  container.bind<HealthService>(TYPES.HealthService).to(DefaultHealthService).inSingletonScope();

  // Market Data Services
  container.bind<RateLimiter>(TYPES.RateLimiter)
    .to(TokenBucketRateLimiter)
    .inSingletonScope();

  // Bind BinanceMarketDataProvider
  container.bind(BinanceMarketDataProvider).toSelf().inSingletonScope();
  container.bind<MarketDataProvider>(TYPES.BinanceProvider).to(BinanceMarketDataProvider);

  // Bind CapitalComMarketDataProvider
  container.bind(CapitalComMarketDataProvider).toSelf().inSingletonScope();
  container.bind<MarketDataProvider>(TYPES.CapitalComProvider).to(CapitalComMarketDataProvider);

  // Set default provider
  container.bind<MarketDataProvider>(TYPES.MarketDataProvider).toService(TYPES.BinanceProvider);

  container.bind<MarketDataCache>(TYPES.MarketDataCache).to(InMemoryMarketDataCache).inSingletonScope();

  // Indicators
  container.bind<HighLowIndicatorInterface>(TYPES.HighLowIndicator).to(HighLowIndicator).inSingletonScope();

  // Strategies
  container.bind<CorrelationCrackStrategyInterface>(TYPES.CorrelationCrackStrategy).to(CorrelationCrackStrategy).inSingletonScope();

  // Bot Services
  container.bind<MessageFormatterService>(TYPES.MessageFormatterService).to(MessageFormatterService).inSingletonScope();
  container.bind<CorrelationConfigurationService>(TYPES.CorrelationConfigurationService).to(CorrelationConfigurationService).inSingletonScope();
  container.bind<CorrelationStrategyRunnerService>(TYPES.CorrelationStrategyRunnerService).to(CorrelationStrategyRunnerServiceImpl).inSingletonScope();

  return container;
}
