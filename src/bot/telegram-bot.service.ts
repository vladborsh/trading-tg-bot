import { injectable, inject } from 'inversify';
import TelegramBot from 'node-telegram-bot-api';
import * as cron from 'node-cron';
import { BotService, TelegramContext, HealthStatus } from '@/domain/interfaces/bot-service.interface';
import { HealthService } from '@/domain/interfaces/health-service.interface';
import { Logger } from '@/utils/logger';
import { TYPES } from '@/config/types';
import { config } from '@/config/environment';

@injectable()
export class TelegramBotService implements BotService {
  private bot: TelegramBot | null = null;

  constructor(
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.HealthService) private healthService: HealthService
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
    // Schedule health checks every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        const health = await this.getHealthStatus();
        if (health.status !== 'healthy') {
          this.logger.warn('System health check failed', { health });
        }
      } catch (error) {
        this.logger.error('Background health check failed', error);
      }
    });

    // Schedule periodic system status report (daily at 9 AM)
    cron.schedule('0 9 * * *', async () => {
      try {
        if (config.TELEGRAM_CHAT_ID) {
          const health = await this.getHealthStatus();
          const message = this.formatHealthMessage(health);
          await this.sendMessage(config.TELEGRAM_CHAT_ID, `Daily System Report:\n\n${message}`);
        }
      } catch (error) {
        this.logger.error('Failed to send daily report', error);
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
    const message = `Welcome to the Trading Bot! 🚀\n\nAvailable commands:\n/help - Show this help message\n/health - Check system health\n/start - Start the bot`;
    await this.sendMessage(context.chatId, message);
  }

  private async handleHealthCommand(context: TelegramContext): Promise<void> {
    const health = await this.getHealthStatus();
    const message = this.formatHealthMessage(health);
    await this.sendMessage(context.chatId, message);
  }

  private async handleHelpCommand(context: TelegramContext): Promise<void> {
    const message = `Trading Bot Help 📚\n\nAvailable commands:\n/start - Initialize the bot\n/health - Check system health status\n/help - Show this help message\n\nFor more information, please check the documentation.`;
    await this.sendMessage(context.chatId, message);
  }

  private async handleUnknownCommand(context: TelegramContext): Promise<void> {
    const message = `Unknown command. Use /help to see available commands.`;
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

  private formatHealthMessage(health: HealthStatus): string {
    const statusEmoji = health.status === 'healthy' ? '✅' : 
                       health.status === 'degraded' ? '⚠️' : '❌';
    
    let message = `${statusEmoji} System Status: ${health.status.toUpperCase()}\n`;
    message += `🕐 Uptime: ${Math.floor(health.uptime / 1000 / 60)} minutes\n`;
    message += `📅 Last Check: ${health.timestamp.toISOString()}\n\n`;
    
    message += 'Services:\n';
    for (const [serviceName, serviceHealth] of Object.entries(health.services)) {
      const serviceEmoji = serviceHealth.status === 'healthy' ? '✅' : '❌';
      message += `${serviceEmoji} ${serviceName}: ${serviceHealth.status}`;
      if (serviceHealth.responseTime) {
        message += ` (${serviceHealth.responseTime}ms)`;
      }
      message += '\n';
    }
    
    return message;
  }
}
