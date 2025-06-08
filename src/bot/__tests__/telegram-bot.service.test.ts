import { TelegramBotService } from '../telegram-bot.service';
import { Logger } from '../../utils/logger';
import { HealthService } from '../../domain/interfaces/health-service.interface';
import { TelegramContext, HealthStatus, ServiceHealth, BotService } from '../../domain/interfaces/bot-service.interface';
import { CorrelationCrackStrategyInterface, StrategyResult } from '../../core/strategies/strategy.interfaces';
import { MessageFormatterService } from '../message-formatter.service';
import { CorrelationConfigurationService } from '../correlation-configuration.service';
import { CorrelationStrategyRunnerService } from '../correlation-strategy-runner.service';
import TelegramBot from 'node-telegram-bot-api';
import * as cron from 'node-cron';

// Mock dependencies
jest.mock('node-telegram-bot-api');
jest.mock('node-cron');
jest.mock('../message-formatter.service');
jest.mock('../../config/environment', () => ({
  config: {
    TELEGRAM_BOT_TOKEN: 'test-token',
    TELEGRAM_CHAT_ID: 'test-chat-id',
  },
}));

describe('TelegramBotService', () => {
  let telegramBotService: TelegramBotService;
  let mockLogger: jest.Mocked<Logger>;
  let mockHealthService: jest.Mocked<HealthService>;
  let mockMessageFormatter: jest.Mocked<MessageFormatterService>;
  let mockTelegramBot: jest.Mocked<TelegramBot>;
  let mockCronSchedule: jest.MockedFunction<typeof cron.schedule>;
  let mockStrategyRunner: jest.Mocked<CorrelationStrategyRunnerService>;
  let mockCorrelationConfig: jest.Mocked<CorrelationConfigurationService>;

  const mockHealthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: new Date('2025-06-03T10:00:00Z'),
    uptime: 300000,
    services: {
      logger: {
        status: 'healthy',
        lastCheck: new Date('2025-06-03T10:00:00Z'),
        responseTime: 5,
      },
      memory: {
        status: 'healthy',
        lastCheck: new Date('2025-06-03T10:00:00Z'),
        responseTime: 2,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Logger mock
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as jest.Mocked<Logger>;

    // Health service mock
    mockHealthService = {
      checkHealth: jest.fn().mockResolvedValue(mockHealthStatus),
      checkServiceHealth: jest.fn().mockResolvedValue(true),
      getUptime: jest.fn().mockReturnValue(300000),
    } as jest.Mocked<HealthService>;

    // Message formatter mock
    mockMessageFormatter = {
      formatHealthMessage: jest.fn().mockReturnValue('Mock system status message'),
      formatStartMessage: jest.fn().mockReturnValue('Welcome to the Trading Bot! 🚀\n\nAvailable commands:\n/help - Show this help message\n/health - Check system health\n/start - Start the bot'),
      formatHelpMessage: jest.fn().mockReturnValue('Mock help message'),
      formatUnknownCommandMessage: jest.fn().mockReturnValue('Mock unknown command message'),
      formatCorrelationCrackSignal: jest.fn().mockReturnValue('Mock signal message'),
    } as jest.Mocked<MessageFormatterService>;

    // Correlation configuration service mock
    mockCorrelationConfig = {
      getAvailablePairs: jest.fn().mockReturnValue(['BTCUSDT/ETHUSDT']),
      getStrategyConfig: jest.fn().mockReturnValue({
        name: 'Test Config',
        timeframe: '1h',
        threshold: 0.8,
      }),
      configs: new Map(),
      initializeConfigs: jest.fn(),
    } as unknown as jest.Mocked<CorrelationConfigurationService>;

    // Strategy runner mock
    mockStrategyRunner = {
      executeStrategy: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<CorrelationStrategyRunnerService>;

    // Telegram bot mock
    mockTelegramBot = {
      on: jest.fn(),
      sendMessage: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<TelegramBot>;

    // Cron mock
    mockCronSchedule = cron.schedule as jest.MockedFunction<typeof cron.schedule>;
    mockCronSchedule.mockImplementation(() => ({} as any));

    (TelegramBot as jest.MockedClass<typeof TelegramBot>).mockImplementation(() => mockTelegramBot);

    // Initialize service with all required dependencies
    telegramBotService = new TelegramBotService(
      mockLogger,
      mockHealthService,
      mockMessageFormatter,
      mockStrategyRunner,
      mockCorrelationConfig
    );
  });

  describe('initialize', () => {
    it('should initialize bot successfully with valid token', async () => {
      await telegramBotService.initialize();

      expect(TelegramBot).toHaveBeenCalledWith('test-token', { polling: true });
      expect(mockTelegramBot.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockTelegramBot.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith('Telegram bot initialized successfully');
    });

    it('should handle missing token gracefully', async () => {
      // Mock the environment module to return undefined token
      jest.doMock('../../config/environment', () => ({
        config: {
          TELEGRAM_BOT_TOKEN: undefined,
          TELEGRAM_CHAT_ID: 'test-chat-id',
        },
      }));

      // Clear the module cache and reimport
      jest.resetModules();
      const { TelegramBotService: TelegramBotServiceWithoutToken } = require('../telegram-bot.service');
      
      const serviceWithMissingToken = new TelegramBotServiceWithoutToken(
        mockLogger,
        mockHealthService,
        mockMessageFormatter,
        mockStrategyRunner,
        mockCorrelationConfig
      );
      await serviceWithMissingToken.initialize();

      expect(mockLogger.warn).toHaveBeenCalledWith('Telegram bot token not provided, bot functionality will be disabled');
      expect(TelegramBot).not.toHaveBeenCalledWith();

      // Restore the original mock
      jest.doMock('../../config/environment', () => ({
        config: {
          TELEGRAM_BOT_TOKEN: 'test-token',
          TELEGRAM_CHAT_ID: 'test-chat-id',
        },
      }));
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Bot initialization failed');
      (TelegramBot as jest.MockedClass<typeof TelegramBot>).mockImplementation(() => {
        throw error;
      });

      await expect(telegramBotService.initialize()).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize Telegram bot', error);
    });
  });

  describe('handleCommand', () => {
    const mockContext: TelegramContext = {
      chatId: 'test-chat-id',
      userId: 'test-user-id',
      messageId: 123,
      text: '/start',
    };

    beforeEach(async () => {
      await telegramBotService.initialize();
    });

    it('should handle /start command and use MessageFormatterService', async () => {
      const welcomeMessage = 'Welcome to the Trading Bot! 🚀';
      mockMessageFormatter.formatStartMessage.mockReturnValue(welcomeMessage);
      
      await telegramBotService.handleCommand('/start', mockContext);

      expect(mockMessageFormatter.formatStartMessage).toHaveBeenCalled();
      expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith(
        'test-chat-id',
        welcomeMessage
      );
    });

    it('should handle /health command and use MessageFormatterService', async () => {
      const healthMessage = '✅ System Status: HEALTHY';
      mockMessageFormatter.formatHealthMessage.mockReturnValue(healthMessage);
      
      await telegramBotService.handleCommand('/health', mockContext);

      expect(mockHealthService.checkHealth).toHaveBeenCalled();
      expect(mockMessageFormatter.formatHealthMessage).toHaveBeenCalledWith(mockHealthStatus);
      expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith(
        'test-chat-id',
        healthMessage
      );
    });

    it('should handle /help command and use MessageFormatterService', async () => {
      const helpMessage = 'Trading Bot Help 📚';
      mockMessageFormatter.formatHelpMessage.mockReturnValue(helpMessage);
      
      await telegramBotService.handleCommand('/help', mockContext);

      expect(mockMessageFormatter.formatHelpMessage).toHaveBeenCalled();
      expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith(
        'test-chat-id',
        helpMessage
      );
    });

    it('should handle unknown commands using MessageFormatterService', async () => {
      const unknownMessage = 'Unknown command. Use /help to see available commands.';
      mockMessageFormatter.formatUnknownCommandMessage.mockReturnValue(unknownMessage);
      
      await telegramBotService.handleCommand('/unknown', mockContext);

      expect(mockMessageFormatter.formatUnknownCommandMessage).toHaveBeenCalled();
      expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith(
        'test-chat-id',
        unknownMessage
      );
    });

    it('should handle case insensitive commands', async () => {
      const welcomeMessage = 'Welcome to the Trading Bot! 🚀';
      mockMessageFormatter.formatStartMessage.mockReturnValue(welcomeMessage);
      
      await telegramBotService.handleCommand('/START', mockContext);

      expect(mockMessageFormatter.formatStartMessage).toHaveBeenCalled();
      expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith(
        'test-chat-id',
        welcomeMessage
      );
    });

    it('should handle command execution errors', async () => {
      const error = new Error('Send message failed');
      mockTelegramBot.sendMessage.mockRejectedValueOnce(error);

      await telegramBotService.handleCommand('/start', mockContext);

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to send Telegram message', error);
      expect(mockTelegramBot.sendMessage).toHaveBeenCalledTimes(1); // Only one call made, which fails
    });

    it('should warn when bot not initialized', async () => {
      const uninitializedService = new TelegramBotService(
        mockLogger,
        mockHealthService,
        mockMessageFormatter,
        mockStrategyRunner,
        mockCorrelationConfig
      );

      await uninitializedService.handleCommand('/start', mockContext);

      expect(mockLogger.warn).toHaveBeenCalledWith('Bot not initialized, cannot handle command');
    });

    it('should handle command handler errors', async () => {
      const error = new Error('Health service failed');
      mockHealthService.checkHealth.mockRejectedValueOnce(error);

      await telegramBotService.handleCommand('/health', mockContext);

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to handle command: /health', error);
      expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith(
        'test-chat-id',
        'Sorry, an error occurred while processing your command.'
      );
    });
  });

  describe('startBackgroundTasks', () => {
    it('should schedule health check cron job', async () => {
      await telegramBotService.startBackgroundTasks();

      expect(mockCronSchedule).toHaveBeenCalledWith('*/5 * * * *', expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith('Background tasks started');
    });

    it('should schedule daily report cron job', async () => {
      await telegramBotService.startBackgroundTasks();

      expect(mockCronSchedule).toHaveBeenCalledWith('0 9 * * *', expect.any(Function));
    });

    it('should execute health check task without errors', async () => {
      let healthCheckCallback: ((now?: Date | 'manual' | 'init') => void) | undefined;
      mockCronSchedule.mockImplementation((schedule, callback) => {
        if (schedule === '*/5 * * * *') {
          healthCheckCallback = callback as (now?: Date | 'manual' | 'init') => void;
        }
        return {} as any;
      });

      await telegramBotService.startBackgroundTasks();
      
      if (healthCheckCallback) {
        await healthCheckCallback();
      }

      expect(mockHealthService.checkHealth).toHaveBeenCalled();
    });

    it('should execute correlation strategy tasks', async () => {
      const availablePairs = ['BTCUSDT/ETHUSDT', 'BTCUSDT/LTCUSDT'];
      mockCorrelationConfig.getAvailablePairs.mockReturnValue(availablePairs);

      let strategyCallback: ((now?: Date | 'manual' | 'init') => void) | undefined;
      mockCronSchedule.mockImplementation((schedule, callback) => {
        if (schedule === '*/5 * * * 1-5') { // Correlation check schedule
          strategyCallback = callback as (now?: Date | 'manual' | 'init') => void;
        }
        return {} as any;
      });

      await telegramBotService.startBackgroundTasks();
      
      if (strategyCallback) {
        await strategyCallback();
      }

      expect(mockCorrelationConfig.getAvailablePairs).toHaveBeenCalled();
      expect(mockStrategyRunner.executeStrategy).toHaveBeenCalledTimes(availablePairs.length);
      availablePairs.forEach(pair => {
        expect(mockStrategyRunner.executeStrategy).toHaveBeenCalledWith(
          pair,
          expect.any(Function)
        );
      });
    });

    it('should handle health check task errors', async () => {
      const error = new Error('Health check failed');
      mockHealthService.checkHealth.mockRejectedValueOnce(error);

      let healthCheckCallback: ((now?: Date | 'manual' | 'init') => void) | undefined;
      mockCronSchedule.mockImplementation((schedule, callback) => {
        if (schedule === '*/5 * * * *') {
          healthCheckCallback = callback as (now?: Date | 'manual' | 'init') => void;
        }
        return {} as any;
      });

      await telegramBotService.startBackgroundTasks();
      if (healthCheckCallback) {
        await healthCheckCallback();
      }

      expect(mockLogger.error).toHaveBeenCalledWith('Background health check failed', error);
    });

    it('should warn when system health is not healthy and use MessageFormatterService', async () => {
      const unhealthyStatus: HealthStatus = {
        ...mockHealthStatus,
        status: 'degraded',
      };
      mockHealthService.checkHealth.mockResolvedValueOnce(unhealthyStatus);
      const unhealthyMessage = '⚠️ System Status: DEGRADED';
      mockMessageFormatter.formatHealthMessage.mockReturnValue(unhealthyMessage);

      let healthCheckCallback: ((now?: Date | 'manual' | 'init') => void) | undefined;
      mockCronSchedule.mockImplementation((schedule, callback) => {
        if (schedule === '*/5 * * * *') {
          healthCheckCallback = callback as (now?: Date | 'manual' | 'init') => void;
        }
        return {} as any;
      });

      await telegramBotService.startBackgroundTasks();
      if (healthCheckCallback) {
        await healthCheckCallback();
      }

      expect(mockLogger.warn).toHaveBeenCalledWith('System health check failed', { health: unhealthyStatus });
    });

    it('should execute daily report task and use MessageFormatterService', async () => {
      await telegramBotService.initialize();
      const formattedHealth = '✅ System Status: HEALTHY';
      mockMessageFormatter.formatHealthMessage.mockReturnValue(formattedHealth);

      let dailyReportCallback: ((now?: Date | 'manual' | 'init') => void) | undefined;
      mockCronSchedule.mockImplementation((schedule, callback) => {
        if (schedule === '0 9 * * *') {
          dailyReportCallback = callback as (now?: Date | 'manual' | 'init') => void;
        }
        return {} as any;
      });

      await telegramBotService.startBackgroundTasks();
      if (dailyReportCallback) {
        await dailyReportCallback();
      }

      expect(mockHealthService.checkHealth).toHaveBeenCalled();
      expect(mockMessageFormatter.formatHealthMessage).toHaveBeenCalledWith(mockHealthStatus);
      expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith(
        'test-chat-id',
        expect.stringContaining('Daily System Report:')
      );
      expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith(
        'test-chat-id',
        expect.stringContaining(formattedHealth)
      );
    });

    it('should handle correlation strategy errors', async () => {
      const error = new Error('Strategy execution failed');
      mockStrategyRunner.executeStrategy.mockRejectedValueOnce(error);

      let strategyCallback: ((now?: Date | 'manual' | 'init') => void) | undefined;
      mockCronSchedule.mockImplementation((schedule, callback) => {
        if (schedule === '*/5 * * * 1-5') {
          strategyCallback = callback as (now?: Date | 'manual' | 'init') => void;
        }
        return {} as any;
      });

      await telegramBotService.startBackgroundTasks();
      if (strategyCallback) {
        await strategyCallback();
      }

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to execute correlation strategy', error);
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status from health service', async () => {
      const result = await telegramBotService.getHealthStatus();

      expect(mockHealthService.checkHealth).toHaveBeenCalled();
      expect(result).toEqual(mockHealthStatus);
    });
  });

  describe('formatHealthMessage', () => {
    beforeEach(async () => {
      await telegramBotService.initialize();
    });

    it('should format healthy status message correctly', async () => {
      const healthyMessage = '✅ System Status: HEALTHY';
      mockMessageFormatter.formatHealthMessage.mockReturnValue(healthyMessage);

      await telegramBotService.handleCommand('/health', {
        chatId: 'test-chat-id',
        userId: 'test-user-id',
        messageId: 123,
      });

      expect(mockHealthService.checkHealth).toHaveBeenCalled();
      expect(mockMessageFormatter.formatHealthMessage).toHaveBeenCalledWith(mockHealthStatus);
      expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith(
        'test-chat-id',
        healthyMessage
      );
    });

    it('should format degraded status message correctly', async () => {
      const degradedStatus: HealthStatus = {
        ...mockHealthStatus,
        status: 'degraded',
      };
      mockHealthService.checkHealth.mockResolvedValueOnce(degradedStatus);
      
      const degradedMessage = '⚠️ System Status: DEGRADED';
      mockMessageFormatter.formatHealthMessage.mockReturnValue(degradedMessage);

      await telegramBotService.handleCommand('/health', {
        chatId: 'test-chat-id',
        userId: 'test-user-id',
        messageId: 123,
      });

      expect(mockMessageFormatter.formatHealthMessage).toHaveBeenCalledWith(degradedStatus);
      expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith(
        'test-chat-id',
        degradedMessage
      );
    });

    it('should format unhealthy status message correctly', async () => {
      const unhealthyStatus: HealthStatus = {
        ...mockHealthStatus,
        status: 'unhealthy',
      };
      mockHealthService.checkHealth.mockResolvedValueOnce(unhealthyStatus);
      
      const unhealthyMessage = '❌ System Status: UNHEALTHY';
      mockMessageFormatter.formatHealthMessage.mockReturnValue(unhealthyMessage);

      await telegramBotService.handleCommand('/health', {
        chatId: 'test-chat-id',
        userId: 'test-user-id',
        messageId: 123,
      });

      expect(mockMessageFormatter.formatHealthMessage).toHaveBeenCalledWith(unhealthyStatus);
      expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith(
        'test-chat-id',
        unhealthyMessage
      );
    });

    it('should handle services without response time', async () => {
      const statusWithoutResponseTime: HealthStatus = {
        ...mockHealthStatus,
        services: {
          logger: {
            status: 'healthy',
            lastCheck: new Date('2025-06-03T10:00:00Z'),
          },
        },
      };
      mockHealthService.checkHealth.mockResolvedValueOnce(statusWithoutResponseTime);
      
      const formattedMessage = '✅ System Status: HEALTHY';
      mockMessageFormatter.formatHealthMessage.mockReturnValue(formattedMessage);

      await telegramBotService.handleCommand('/health', {
        chatId: 'test-chat-id',
        userId: 'test-user-id',
        messageId: 123,
      });

      expect(mockMessageFormatter.formatHealthMessage).toHaveBeenCalledWith(statusWithoutResponseTime);
      expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith(
        'test-chat-id',
        formattedMessage
      );
    });
  });

  describe('event handlers', () => {
    beforeEach(async () => {
      await telegramBotService.initialize();
    });

    it('should setup message event handler', () => {
      expect(mockTelegramBot.on).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('should setup error event handler', () => {
      expect(mockTelegramBot.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should handle telegram bot errors', () => {
      const errorHandler = mockTelegramBot.on.mock.calls.find(call => call[0] === 'error')?.[1];
      const error = new Error('Telegram API error');

      if (errorHandler) {
        errorHandler(error);
      }

      expect(mockLogger.error).toHaveBeenCalledWith('Telegram bot error', error);
    });

    it('should process commands from message handler', async () => {
      const messageHandler = mockTelegramBot.on.mock.calls.find(call => call[0] === 'message')?.[1];
      const mockMessage = {
        chat: { id: 123 },
        from: { id: 456 },
        message_id: 789,
        text: '/start',
      };

      if (messageHandler) {
        await messageHandler(mockMessage);
      }

      expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith(
        '123',
        expect.stringContaining('Welcome to the Trading Bot!')
      );
    });

    it('should ignore non-command messages', async () => {
      const messageHandler = mockTelegramBot.on.mock.calls.find(call => call[0] === 'message')?.[1];
      const mockMessage = {
        chat: { id: 123 },
        from: { id: 456 },
        message_id: 789,
        text: 'Hello world',
      };

      if (messageHandler) {
        await messageHandler(mockMessage);
      }

      expect(mockTelegramBot.sendMessage).not.toHaveBeenCalled();
    });

    it('should handle messages without from field', async () => {
      const messageHandler = mockTelegramBot.on.mock.calls.find(call => call[0] === 'message')?.[1];
      const mockMessage = {
        chat: { id: 123 },
        message_id: 789,
        text: '/start',
      };

      if (messageHandler) {
        await messageHandler(mockMessage);
      }

      expect(mockMessageFormatter.formatStartMessage).toHaveBeenCalled();
      expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith(
        '123',
        'Welcome to the Trading Bot! 🚀\n\nAvailable commands:\n/help - Show this help message\n/health - Check system health\n/start - Start the bot'
      );
    });
  });

  describe('sendMessage error handling', () => {
    beforeEach(async () => {
      await telegramBotService.initialize();
    });

    it('should handle sendMessage errors gracefully', async () => {
      const error = new Error('Telegram API error');
      mockTelegramBot.sendMessage.mockRejectedValueOnce(error);

      await telegramBotService.handleCommand('/start', {
        chatId: 'test-chat-id',
        userId: 'test-user-id',
        messageId: 123,
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to send Telegram message', error);
    });
  });
});
