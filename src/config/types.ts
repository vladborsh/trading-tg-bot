export const TYPES = {
  // Core Services
  BotService: Symbol.for('BotService'),
  Logger: Symbol.for('Logger'),
  
  // Market Data
  MarketDataProvider: Symbol.for('MarketDataProvider'),
  BinanceProvider: Symbol.for('BinanceProvider'),
  BinanceConfig: Symbol.for('BinanceConfig'),
  CapitalComProvider: Symbol.for('CapitalComProvider'),
  ForexFactoryProvider: Symbol.for('ForexFactoryProvider'),
  
  // Signal Processing
  SignalProcessor: Symbol.for('SignalProcessor'),
  CorrelationTracker: Symbol.for('CorrelationTracker'),
  VolumeAnalyzer: Symbol.for('VolumeAnalyzer'),
  
  // Indicators
  HighLowIndicator: Symbol.for('HighLowIndicator'),
  
  // Strategies
  CorrelationCrackStrategy: Symbol.for('CorrelationCrackStrategy'),
  
  // Notification
  NotificationService: Symbol.for('NotificationService'),
  ChartService: Symbol.for('ChartService'),
  
  // Backtesting
  BacktestingEngine: Symbol.for('BacktestingEngine'),
  PerformanceCalculator: Symbol.for('PerformanceCalculator'),
  
  // Cache
  CacheService: Symbol.for('CacheService'),
  MarketDataCache: Symbol.for('MarketDataCache'),
  
  // Rate Limiting
  RateLimiter: Symbol.for('RateLimiter'),
  
  // Health
  HealthService: Symbol.for('HealthService'),
  
  // Bot Services
  MessageFormatterService: Symbol.for('MessageFormatterService'),
  CorrelationConfigurationService: Symbol.for('CorrelationConfigurationService'),
  CorrelationStrategyRunnerService: Symbol.for('CorrelationStrategyRunnerService'),
} as const;
