import { injectable } from 'inversify';
import { HealthStatus } from '@/domain/interfaces/bot-service.interface';
import { CrossDirection, StrategySignal } from '@/core/strategies/strategy.interfaces';
import { BOT_CONSTANTS } from '@/config/constants';

@injectable()
export class MessageFormatterService {
  
  formatHealthMessage(health: HealthStatus): string {
    const statusEmoji = health.status === 'healthy' ? '✅' : 
                       health.status === 'degraded' ? '⚠️' : '❌';
    
    let message = `${statusEmoji} System Status: ${health.status.toUpperCase()}\n`;
    message += `🕐 Uptime: ${Math.floor(health.uptime / BOT_CONSTANTS.MILLISECONDS_PER_MINUTE)} minutes\n`;
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

  formatCorrelationCrackSignal(signal: StrategySignal): string {
    const directionEmoji = signal.direction === CrossDirection.CROSS_UNDER ? '📉' : '📈';
    const confidencePercent = (signal.confidence * BOT_CONSTANTS.PERCENTAGE_MULTIPLIER).toFixed(1);
    
    let message = `🚨 CORRELATION CRACK DETECTED ${directionEmoji}\n\n`;
    message += `💰 Trigger Asset: ${signal.triggerAsset}\n`;
    message += `📊 Direction: ${signal.direction.replace('_', ' ').toUpperCase()}\n`;
    message += `🎯 Reference Level: ${signal.referenceLevel.toFixed(BOT_CONSTANTS.PRICE_DECIMAL_PLACES)}\n`;
    message += `📈 Confidence: ${confidencePercent}%\n`;
    message += `🕐 Time: ${signal.timestamp.toISOString()}\n\n`;
    
    message += `🔗 Correlated Assets (No Break):\n`;
    signal.correlatedAssets.forEach((asset: string) => {
      message += `• ${asset}\n`;
    });
    
    message += `\n📋 Analysis:\n`;
    message += `${signal.triggerAsset} broke ${signal.direction === CrossDirection.CROSS_UNDER ? 'below' : 'above'} `;
    message += `the session level while ${signal.correlatedAssets.join(' and ')} held the level.\n`;
    message += `This suggests potential divergence in crypto momentum.`;
    
    return message;
  }

  formatStartMessage(): string {
    return `Welcome to the Trading Bot! 🚀\n\nAvailable commands:\n/help - Show this help message\n/health - Check system health\n/start - Start the bot`;
  }

  formatHelpMessage(): string {
    return `Trading Bot Help 📚\n\nAvailable commands:\n/start - Initialize the bot\n/health - Check system health status\n/help - Show this help message\n\nFor more information, please check the documentation.`;
  }

  formatUnknownCommandMessage(): string {
    return `Unknown command. Use /help to see available commands.`;
  }
}
