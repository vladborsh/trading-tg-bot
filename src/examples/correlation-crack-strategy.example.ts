/**
 * Correlation Crack Strategy Usage Example
 * 
 * This example demonstrates how to use the CorrelationCrackStrategy
 * to detect London session breakouts in correlated forex pairs.
 */
import 'reflect-metadata';
import { Container } from 'inversify';
import { CorrelationCrackStrategy } from '../core/strategies/correlation-crack.strategy';
import { HighLowIndicator } from '../core/indicators/high-low.indicator';
import { BinanceMarketDataProvider } from '../data/binance-market-data.provider';
import { CorrelationCrackConfig, CrossDirection, AssetCondition } from '../core/strategies/strategy.interfaces';
import { SessionSpec } from '../core/indicators/indicator.interfaces';
import { TYPES } from '../config/types';
import { createLogger, format, transports } from 'winston';

/**
 * Setup dependency injection container
 */
function setupContainer(): Container {
  const container = new Container();

  // Logger
  const logger = createLogger({
    level: 'info',
    format: format.combine(
      format.timestamp(),
      format.errors({ stack: true }),
      format.json()
    ),
    transports: [
      new transports.Console({
        format: format.combine(
          format.colorize(),
          format.simple()
        )
      })
    ]
  });

  // Binance configuration (replace with your actual API keys)
  const binanceConfig = {
    apiKey: process.env.BINANCE_API_KEY || 'your_binance_api_key',
    apiSecret: process.env.BINANCE_API_SECRET || 'your_binance_api_secret',
    testnet: true // Use testnet for examples
  };

  // Bind dependencies
  container.bind(TYPES.Logger).toConstantValue(logger);
  container.bind(TYPES.BinanceConfig).toConstantValue(binanceConfig);
  container.bind(TYPES.MarketDataProvider).to(BinanceMarketDataProvider);
  container.bind(TYPES.HighLowIndicator).to(HighLowIndicator);
  container.bind(TYPES.CorrelationCrackStrategy).to(CorrelationCrackStrategy);

  return container;
}

/**
 * Example 1: London Session High Break Strategy
 * Detect when one EUR pair breaks above London session high while others don't
 */
async function londonSessionHighBreakExample(): Promise<void> {
  console.log('\n=== London Session High Break Example ===');
  
  const container = setupContainer();
  const strategy = container.get<CorrelationCrackStrategy>(TYPES.CorrelationCrackStrategy);

  // London session: 3am - 8am NY time
  const londonSession: SessionSpec = {
    type: 'time_session',
    startHour: 3,  // 3 AM NY time
    endHour: 8,    // 8 AM NY time
    timezone: 'America/New_York'
  };

  const config: CorrelationCrackConfig = {
    primaryAssets: ['EURUSD', 'EURGBP', 'EURJPY'], // Correlated EUR pairs
    period: londonSession,
    direction: CrossDirection.CROSS_OVER, // Looking for break above London high
    useBodyHighLow: false, // Use actual high/low, not body
    timezone: 'America/New_York',
    minCorrelatedAssets: 1 // At least 1 other asset should NOT break
  };

  try {
    const result = await strategy.execute(config);
    
    if (result.success && result.signal) {
      console.log('🚨 CORRELATION CRACK SIGNAL DETECTED! 🚨');
      console.log(`Strategy: ${result.strategyName}`);
      console.log(`Trigger Asset: ${result.signal.triggerAsset}`);
      console.log(`Direction: ${result.signal.direction}`);
      console.log(`Reference Level: ${result.signal.referenceLevel}`);
      console.log(`Confidence: ${(result.signal.confidence * 100).toFixed(1)}%`);
      console.log(`Correlated Assets (no break): ${result.signal.correlatedAssets.join(', ')}`);
      console.log(`Signal Time: ${result.signal.timestamp.toISOString()}`);
      
      console.log('\nAsset Conditions:');
      if (result.metadata?.assetConditions) {
        result.metadata.assetConditions.forEach((condition: AssetCondition) => {
          console.log(`  ${condition.symbol}:`);
          console.log(`    Current Price: ${condition.currentPrice}`);
          console.log(`    Reference Level: ${condition.referenceLevel}`);
          console.log(`    Has Crossed: ${condition.hasCrossed}`);
          if (condition.crossTime) {
            console.log(`    Cross Time: ${condition.crossTime.toISOString()}`);
          }
        });
      }
    } else if (result.success) {
      console.log('No correlation crack pattern detected.');
      console.log('All assets either broke the level or none did.');
    } else {
      console.error('Strategy execution failed:', result.error);
    }
  } catch (error) {
    console.error('Error executing strategy:', error);
  }
}

/**
 * Example 2: London Session Low Break Strategy  
 * Detect when one EUR pair breaks below London session low while others don't
 */
async function londonSessionLowBreakExample(): Promise<void> {
  console.log('\n=== London Session Low Break Example ===');
  
  const container = setupContainer();
  const strategy = container.get<CorrelationCrackStrategy>(TYPES.CorrelationCrackStrategy);

  const londonSession: SessionSpec = {
    type: 'time_session',
    startHour: 3,
    endHour: 8,
    timezone: 'America/New_York'
  };

  const config: CorrelationCrackConfig = {
    primaryAssets: ['GBPUSD', 'GBPJPY', 'EURGBP'], // Correlated GBP pairs
    period: londonSession,
    direction: CrossDirection.CROSS_UNDER, // Looking for break below London low
    useBodyHighLow: false,
    timezone: 'America/New_York',
    minCorrelatedAssets: 1
  };

  try {
    const result = await strategy.execute(config);
    
    if (result.success && result.signal) {
      console.log('🚨 CORRELATION CRACK SIGNAL DETECTED! 🚨');
      console.log(`Trigger Asset: ${result.signal.triggerAsset} broke BELOW London session low`);
      console.log(`Reference Level (LLS): ${result.signal.referenceLevel}`);
      console.log(`Assets that held the level: ${result.signal.correlatedAssets.join(', ')}`);
      console.log(`Confidence: ${(result.signal.confidence * 100).toFixed(1)}%`);
    } else if (result.success) {
      console.log('No correlation crack pattern detected for London session low break.');
    } else {
      console.error('Strategy execution failed:', result.error);
    }
  } catch (error) {
    console.error('Error executing strategy:', error);
  }
}

/**
 * Example 3: Previous Day High Break Strategy
 * Detect when one asset breaks previous day high while correlated assets don't
 */
async function previousDayHighBreakExample(): Promise<void> {
  console.log('\n=== Previous Day High Break Example ===');
  
  const container = setupContainer();
  const strategy = container.get<CorrelationCrackStrategy>(TYPES.CorrelationCrackStrategy);

  const config: CorrelationCrackConfig = {
    primaryAssets: ['AUDUSD', 'NZDUSD'], // Correlated commodity currencies
    period: 'prev_day',
    direction: CrossDirection.CROSS_OVER, // Break above previous day high
    useBodyHighLow: false,
    minCorrelatedAssets: 1
  };

  try {
    const result = await strategy.execute(config);
    
    if (result.success && result.signal) {
      console.log('🚨 CORRELATION CRACK SIGNAL DETECTED! 🚨');
      console.log(`${result.signal.triggerAsset} broke above previous day high`);
      console.log(`while ${result.signal.correlatedAssets.join(', ')} remained below`);
      console.log(`This suggests strong individual momentum in ${result.signal.triggerAsset}`);
    } else if (result.success) {
      console.log('No previous day high break correlation crack detected.');
    } else {
      console.error('Strategy execution failed:', result.error);
    }
  } catch (error) {
    console.error('Error executing strategy:', error);
  }
}

/**
 * Example 4: Custom Time Session Strategy
 * Define a custom trading session and detect correlation cracks
 */
async function customSessionExample(): Promise<void> {
  console.log('\n=== Custom Session Example ===');
  
  const container = setupContainer();
  const strategy = container.get<CorrelationCrackStrategy>(TYPES.CorrelationCrackStrategy);

  // Custom session: US Market Open (9:30 AM - 11:30 AM NY time)
  const usOpenSession: SessionSpec = {
    type: 'time_session',
    startHour: 9,
    startMinute: 30,
    endHour: 11,
    endMinute: 30,
    timezone: 'America/New_York'
  };

  const config: CorrelationCrackConfig = {
    primaryAssets: ['SPY', 'QQQ', 'IWM'], // US equity ETFs (if supported by provider)
    period: usOpenSession,
    direction: CrossDirection.CROSS_UNDER, // Looking for breakdown
    useBodyHighLow: true, // Use body high/low for equities
    minCorrelatedAssets: 1
  };

  try {
    const result = await strategy.execute(config);
    
    if (result.success && result.signal) {
      console.log('🚨 US MARKET OPEN CORRELATION CRACK! 🚨');
      console.log(`${result.signal.triggerAsset} broke down while others held up`);
      console.log('This could indicate sector-specific weakness');
    } else if (result.success) {
      console.log('No correlation crack in US market open session.');
    } else {
      console.error('Strategy execution failed:', result.error);
    }
  } catch (error) {
    console.error('Error executing strategy:', error);
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  console.log('🔄 Starting Correlation Crack Strategy Examples...');
  
  try {
    // Run all examples
    await londonSessionHighBreakExample();
    await londonSessionLowBreakExample();
    await previousDayHighBreakExample();
    await customSessionExample();
    
    console.log('\n✅ All examples completed successfully!');
    
    console.log('\n📋 Strategy Summary:');
    console.log('- London Session High Break: Detects when one EUR pair breaks above London high');
    console.log('- London Session Low Break: Detects when one GBP pair breaks below London low');
    console.log('- Previous Day High Break: Detects divergence in commodity currency momentum');
    console.log('- Custom Session: Demonstrates flexible time session configuration');
    
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

/**
 * Configuration tips and best practices
 */
function printUsageTips(): void {
  console.log('\n💡 Correlation Crack Strategy Tips:');
  console.log('1. Use 2-4 highly correlated assets for best results');
  console.log('2. London session (3-8 AM NY) is ideal for forex pairs');
  console.log('3. Adjust confidence thresholds based on your risk tolerance');
  console.log('4. Consider using body high/low for cleaner signals in noisy markets');
  console.log('5. Monitor multiple timeframes to confirm the signal');
  console.log('6. Combine with volume analysis for additional confirmation');
  
  console.log('\n⚠️  Risk Management:');
  console.log('- Always use proper position sizing');
  console.log('- Set stop losses based on the reference level');
  console.log('- Consider partial profits at key resistance/support levels');
  console.log('- Monitor correlation breakdown as a signal invalidation');
}

// Run the examples if this file is executed directly
if (require.main === module) {
  printUsageTips();
  main().catch(console.error);
}

export {
  londonSessionHighBreakExample,
  londonSessionLowBreakExample,
  previousDayHighBreakExample,
  customSessionExample
};
