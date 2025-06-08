import { injectable, inject } from 'inversify';
import TelegramBot from 'node-telegram-bot-api';
import * as cron from 'node-cron';
import { BotService, TelegramContext, HealthStatus } from '@/domain/interfaces/bot-service.interface';
import { HealthService } from '@/domain/interfaces/health-service.interface';
import { Logger } from '@/utils/logger';
import { TYPES } from '@/config/types';
import { config } from '@/config/environment';
import { BOT_CONSTANTS } from '@/config/constants';
import { MessageFormatterService } from './message-formatter.service';
import { CorrelationStrategyRunnerService } from './correlation-strategy-runner.service';
import { CorrelationConfigurationService } from './correlation-configuration.service';

@injectable()
export class TelegramBotService implements BotService {
  private bot: TelegramBot | null = null;

  constructor(
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.HealthService) private healthService: HealthService,
    @inject(TYPES.MessageFormatterService) private messageFormatter: MessageFormatterService,
    @inject(TYPES.CorrelationStrategyRunnerService) private strategyRunner: CorrelationStrategyRunnerService,
    @inject(TYPES.CorrelationConfigurationService) private correlationConfig: CorrelationConfigurationService
  ) {}

  async initialize(): Promise<void> {
    try {
      if (!config.TELEGRAM_BOT_TOKEN) {
        this.logger.warn('Telegram bot token not provided, bot functionality will be disabled');
        return;
      }

      this.bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { polling: true });
      this.setupEventHandlers();
      this.logger.info('Telegram bot initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Telegram bot', error);
      throw error;
    }
  }

  async handleCommand(command: string, context: TelegramContext): Promise<void> {
    if (!this.bot) {
      this.logger.warn('Bot not initialized, cannot handle command');
      return;
    }

    try {
      switch (command.toLowerCase()) {
        case '/start':
          await this.handleStartCommand(context);
          break;
        case '/health':
          await this.handleHealthCommand(context);
          break;
        case '/help':
          await this.handleHelpCommand(context);
          break;
        default:
          await this.handleUnknownCommand(context);
      }
    } catch (error) {
      this.logger.error(`Failed to handle command: ${command}`, error);
      await this.sendMessage(context.chatId, 'Sorry, an error occurred while processing your command.');
    }
  }

  async startBackgroundTasks(): Promise<void> {
    // Schedule health checks
    cron.schedule(BOT_CONSTANTS.HEALTH_CHECK_SCHEDULE, async () => {
      try {
        const health = await this.getHealthStatus();
        if (health.status !== 'healthy') {
          this.logger.warn('System health check failed', { health });
        }
      } catch (error) {
        this.logger.error('Background health check failed', error);
      }
    });

    // Schedule daily system status report
    cron.schedule(BOT_CONSTANTS.DAILY_REPORT_SCHEDULE, async () => {
      try {
        if (config.TELEGRAM_CHAT_ID) {
          const health = await this.getHealthStatus();
          const message = this.messageFormatter.formatHealthMessage(health);
          await this.sendMessage(config.TELEGRAM_CHAT_ID, `Daily System Report:\n\n${message}`);
        }
      } catch (error) {
        this.logger.error('Failed to send daily report', error);
      }
    });

    // Schedule correlation strategy execution for each configured pair
    cron.schedule(BOT_CONSTANTS.CORRELATION_CHECK_SCHEDULE, async () => {
      try {
        // Execute strategy for each configured correlation pair
        for (const pair of this.correlationConfig.getAvailablePairs()) {
          await this.strategyRunner.executeStrategy(pair, 
            async (message: string) => {
              if (config.TELEGRAM_CHAT_ID) {
                await this.sendMessage(config.TELEGRAM_CHAT_ID, message);
              }
            }
          );
        }
      } catch (error) {
        this.logger.error('Failed to execute correlation strategy', error);
      }
    });

    this.logger.info('Background tasks started');
  }

  async getHealthStatus(): Promise<HealthStatus> {
    return await this.healthService.checkHealth();
  }

  private setupEventHandlers(): void {
    if (!this.bot) return;

    this.bot.on('message', async (msg) => {
      const context: TelegramContext = {
        chatId: msg.chat.id.toString(),
        userId: msg.from?.id.toString() || '',
        messageId: msg.message_id,
        text: msg.text,
      };

      if (msg.text?.startsWith('/')) {
        await this.handleCommand(msg.text, context);
      }
    });

    this.bot.on('error', (error) => {
      this.logger.error('Telegram bot error', error);
    });
  }

  private async handleStartCommand(context: TelegramContext): Promise<void> {
    const message = this.messageFormatter.formatStartMessage();
    await this.sendMessage(context.chatId, message);
  }

  private async handleHealthCommand(context: TelegramContext): Promise<void> {
    const health = await this.getHealthStatus();
    const message = this.messageFormatter.formatHealthMessage(health);
    await this.sendMessage(context.chatId, message);
  }

  private async handleHelpCommand(context: TelegramContext): Promise<void> {
    const message = this.messageFormatter.formatHelpMessage();
    await this.sendMessage(context.chatId, message);
  }

  private async handleUnknownCommand(context: TelegramContext): Promise<void> {
    const message = this.messageFormatter.formatUnknownCommandMessage();
    await this.sendMessage(context.chatId, message);
  }

  private async sendMessage(chatId: string, message: string): Promise<void> {
    if (!this.bot) return;
    
    try {
      await this.bot.sendMessage(chatId, message);
    } catch (error) {
      this.logger.error('Failed to send Telegram message', error);
    }
  }
}
