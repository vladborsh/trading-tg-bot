import { injectable } from 'inversify';
import { CorrelationCrackConfig, CrossDirection } from '@/core/strategies/strategy.interfaces';
import { SessionSpec } from '@/core/indicators/indicator.interfaces';
import { BOT_CONSTANTS } from '@/config/constants';

export interface CorrelationPairConfig {
  name: string;
  assets: string[];
  session: SessionSpec;
  direction: CrossDirection;
}

@injectable()
export class CorrelationConfigurationService {
  private readonly configs: Map<string, CorrelationPairConfig> = new Map();

  constructor() {
    this.initializeConfigs();
  }

  private initializeConfigs(): void {
    // Crypto correlation setup
    this.configs.set('crypto', {
      name: 'Crypto',
      assets: ['BTCUSDT', 'ETHUSDT'],
      session: {
        type: 'time_session',
        startHour: BOT_CONSTANTS.NY_SESSION_START_HOUR,
        startMinute: 0,
        endHour: BOT_CONSTANTS.NY_SESSION_END_HOUR,
        endMinute: 0,
        timezone: BOT_CONSTANTS.NY_TIMEZONE
      },
      direction: CrossDirection.CROSS_UNDER
    });

    // Future setups can be added here:
    // EUR/USD correlation
    // Nasdaq/S&P500 correlation
  }

  getStrategyConfig(pairName: string): CorrelationCrackConfig {
    const pairConfig = this.configs.get(pairName);
    if (!pairConfig) {
      throw new Error(`Correlation pair configuration not found: ${pairName}`);
    }

    return {
      primaryAssets: pairConfig.assets,
      period: pairConfig.session,
      direction: pairConfig.direction,
      marketDataInterval: BOT_CONSTANTS.DEFAULT_CANDLE_INTERVAL,
      useBodyHighLow: false,
      timezone: BOT_CONSTANTS.NY_TIMEZONE,
      minCorrelatedAssets: BOT_CONSTANTS.MIN_CORRELATED_ASSETS,
      klinesLimit: BOT_CONSTANTS.KLINES_LIMIT,
      crossDetectionLookback: BOT_CONSTANTS.CROSS_DETECTION_LOOKBACK
    };
  }

  getAvailablePairs(): string[] {
    return Array.from(this.configs.keys());
  }
}
