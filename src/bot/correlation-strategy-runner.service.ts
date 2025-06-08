import { injectable, inject } from 'inversify';
import { Logger } from '@/utils/logger';
import { TYPES } from '@/config/types';
import { CorrelationCrackStrategyInterface } from '@/core/strategies/strategy.interfaces';
import { CorrelationConfigurationService } from './correlation-configuration.service';
import { BOT_CONSTANTS } from '@/config/constants';
import { MessageFormatterService } from './message-formatter.service';

export interface CorrelationStrategyRunnerService {
  executeStrategy(pairName: string, onSignal: (message: string) => Promise<void>): Promise<void>;
}

@injectable()
export class CorrelationStrategyRunnerServiceImpl implements CorrelationStrategyRunnerService {
  
  constructor(
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.CorrelationCrackStrategy) private correlationCrackStrategy: CorrelationCrackStrategyInterface,
    @inject(TYPES.CorrelationConfigurationService) private configService: CorrelationConfigurationService,
    @inject(TYPES.MessageFormatterService) private messageFormatter: MessageFormatterService
  ) {}

  async executeStrategy(pairName: string, onSignal: (message: string) => Promise<void>): Promise<void> {
    const now = new Date();
    const nyHour = new Date(now.toLocaleString("en-US", { timeZone: BOT_CONSTANTS.NY_TIMEZONE })).getHours();
    
    // Only run during NY session hours
    if (nyHour < BOT_CONSTANTS.NY_SESSION_START_HOUR || nyHour >= BOT_CONSTANTS.NY_SESSION_END_HOUR) {
      return;
    }

    try {
      const strategyConfig = this.configService.getStrategyConfig(pairName);

      this.logger.debug('Executing correlation crack strategy', { 
        assets: strategyConfig.primaryAssets,
        nyHour,
        session: `NY ${BOT_CONSTANTS.NY_SESSION_START_HOUR}-${BOT_CONSTANTS.NY_SESSION_END_HOUR}`
      });

      const result = await this.correlationCrackStrategy.execute(strategyConfig);

      if (result.success && result.signal) {
        const signalMessage = this.messageFormatter.formatCorrelationCrackSignal(result.signal);
        
        this.logger.info('Correlation crack signal detected', { 
          signal: result.signal,
          confidence: result.signal.confidence 
        });

        await onSignal(signalMessage);
      } else if (!result.success) {
        this.logger.warn('Correlation crack strategy execution failed', { 
          error: result.error,
          config: strategyConfig 
        });
      } else {
        this.logger.debug('No correlation crack signal detected');
      }

    } catch (error) {
      this.logger.error('Error executing correlation crack strategy', error);
    }
  }
}
