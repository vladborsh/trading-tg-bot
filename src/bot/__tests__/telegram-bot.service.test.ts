import { TelegramBotService } from '../telegram-bot.service';
import { Logger } from '../../utils/logger';
import { HealthService } from '../../domain/interfaces/health-service.interface';
import { TelegramContext, HealthStatus } from '../../domain/interfaces/bot-service.interface';
import TelegramBot from 'node-telegram-bot-api';
import * as cron from 'node-cron';

// Mock dependencies
jest.mock('node-telegram-bot-api');
jest.mock('node-cron');
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
  let mockTelegramBot: jest.Mocked<TelegramBot>;
  let mockCronSchedule: jest.MockedFunction<typeof cron.schedule>;

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

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    mockHealthService = {
      checkHealth: jest.fn().mockResolvedValue(mockHealthStatus),
      checkServiceHealth: jest.fn().mockResolvedValue(true),
      getUptime: jest.fn().mockReturnValue(300000),
    };

    mockTelegramBot = {
      on: jest.fn(),
      sendMessage: jest.fn().mockResolvedValue({}),
    } as any;

    mockCronSchedule = cron.schedule as jest.MockedFunction<typeof cron.schedule>;
    mockCronSchedule.mockImplementation(() => ({} as any));

    (TelegramBot as jest.MockedClass<typeof TelegramBot>).mockImplementation(() => mockTelegramBot);

    telegramBotService = new TelegramBotService(mockLogger, mockHealthService);
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
      
      const serviceWithMissingToken = new TelegramBotServiceWithoutToken(mockLogger, mockHealthService);
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

    it('should handle /start command', async () => {
      await telegramBotService.handleCommand('/start', mockContext);

      expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith(
        'test-chat-id',
        'Welcome to the Trading Bot! 🚀\n\nAvailable commands:\n/help - Show this help message\n/health - Check system health\n/start - Start the bot'
      );
    });

    it('should handle /health command', async () => {
      await telegramBotService.handleCommand('/health', mockContext);

      expect(mockHealthService.checkHealth).toHaveBeenCalled();
      expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith(
        'test-chat-id',
        expect.stringContaining('✅ System Status: HEALTHY')
      );
    });

    it('should handle /help command', async () => {
      await telegramBotService.handleCommand('/help', mockContext);

      expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith(
        'test-chat-id',
        'Trading Bot Help 📚\n\nAvailable commands:\n/start - Initialize the bot\n/health - Check system health status\n/help - Show this help message\n\nFor more information, please check the documentation.'
      );
    });

    it('should handle unknown commands', async () => {
      await telegramBotService.handleCommand('/unknown', mockContext);

      expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith(
        'test-chat-id',
        'Unknown command. Use /help to see available commands.'
      );
    });

    it('should handle case insensitive commands', async () => {
      await telegramBotService.handleCommand('/START', mockContext);

      expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith(
        'test-chat-id',
        expect.stringContaining('Welcome to the Trading Bot!')
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
      const uninitializedService = new TelegramBotService(mockLogger, mockHealthService);

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
      
      // Execute the health check callback
      if (healthCheckCallback) {
        await healthCheckCallback();
      }

      expect(mockHealthService.checkHealth).toHaveBeenCalled();
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

    it('should warn when system health is not healthy', async () => {
      const unhealthyStatus: HealthStatus = {
        ...mockHealthStatus,
        status: 'degraded',
      };
      mockHealthService.checkHealth.mockResolvedValueOnce(unhealthyStatus);

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

    it('should execute daily report task', async () => {
      await telegramBotService.initialize();

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
      expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith(
        'test-chat-id',
        expect.stringContaining('Daily System Report:')
      );
    });

    it('should handle daily report task errors', async () => {
      const error = new Error('Daily report failed');
      mockHealthService.checkHealth.mockRejectedValueOnce(error);

      let dailyReportCallback: ((now?: Date | 'manual' | 'init') => void) | undefined;
      mockCronSchedule.mockImplementation((schedule, callback) => {
        if (schedule === '0 9 * * *') {
          dailyReportCallback = callback as (now?: Date | 'manual' | 'init') => void;
        }
        return {} as any;
      });

      await telegramBotService.initialize();
      await telegramBotService.startBackgroundTasks();
      if (dailyReportCallback) {
        await dailyReportCallback();
      }

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to send daily report', error);
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
      await telegramBotService.handleCommand('/health', {
        chatId: 'test-chat-id',
        userId: 'test-user-id',
        messageId: 123,
      });

      const expectedMessage = expect.stringMatching(/✅ System Status: HEALTHY/);
      expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith('test-chat-id', expectedMessage);
    });

    it('should format degraded status message correctly', async () => {
      const degradedStatus: HealthStatus = {
        ...mockHealthStatus,
        status: 'degraded',
      };
      mockHealthService.checkHealth.mockResolvedValueOnce(degradedStatus);

      await telegramBotService.handleCommand('/health', {
        chatId: 'test-chat-id',
        userId: 'test-user-id',
        messageId: 123,
      });

      const expectedMessage = expect.stringMatching(/⚠️ System Status: DEGRADED/);
      expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith('test-chat-id', expectedMessage);
    });

    it('should format unhealthy status message correctly', async () => {
      const unhealthyStatus: HealthStatus = {
        ...mockHealthStatus,
        status: 'unhealthy',
      };
      mockHealthService.checkHealth.mockResolvedValueOnce(unhealthyStatus);

      await telegramBotService.handleCommand('/health', {
        chatId: 'test-chat-id',
        userId: 'test-user-id',
        messageId: 123,
      });

      const expectedMessage = expect.stringMatching(/❌ System Status: UNHEALTHY/);
      expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith('test-chat-id', expectedMessage);
    });

    it('should include uptime in formatted message', async () => {
      await telegramBotService.handleCommand('/health', {
        chatId: 'test-chat-id',
        userId: 'test-user-id',
        messageId: 123,
      });

      const expectedMessage = expect.stringMatching(/🕐 Uptime: 5 minutes/);
      expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith('test-chat-id', expectedMessage);
    });

    it('should include service status in formatted message', async () => {
      await telegramBotService.handleCommand('/health', {
        chatId: 'test-chat-id',
        userId: 'test-user-id',
        messageId: 123,
      });

      const expectedMessage = expect.stringMatching(/✅ logger: healthy \(5ms\)/);
      expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith('test-chat-id', expectedMessage);
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

      await telegramBotService.handleCommand('/health', {
        chatId: 'test-chat-id',
        userId: 'test-user-id',
        messageId: 123,
      });

      const expectedMessage = expect.stringMatching(/✅ logger: healthy\n/);
      expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith('test-chat-id', expectedMessage);
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

      expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith(
        '123',
        expect.stringContaining('Welcome to the Trading Bot!')
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
