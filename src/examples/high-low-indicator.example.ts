/**
 * Example usage of High/Low Indicator
 * 
 * This example demonstrates how to use the High/Low indicator
 * to calculate high and low prices for various time periods.
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { IndicatorService } from '../core/indicators/indicator.service';
import { HighLowIndicatorConfig } from '../core/indicators/indicator.interfaces';
import { TYPES } from '../config/types';
import { setupContainer } from '../config/inversify.config';

// Mock logger for example
const mockLogger = {
  info: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.debug
} as any;

async function main() {
  console.log('🎯 High/Low Indicator Example\n');

  try {
    // Setup dependency injection container
    const container = setupContainer();
    
    // Get the indicator service
    const indicatorService = container.get<IndicatorService>(TYPES.IndicatorService);

    // Example 1: Previous day high/low
    console.log('📊 Example 1: Previous Day High/Low');
    console.log('=====================================');
    
    const prevDayResult = await indicatorService.getHighLowForPreviousPeriod(
      'BTC/USDT', 
      'day'
    );
    
    console.log(`Symbol: ${prevDayResult.symbol}`);
    console.log(`Period: Previous Day`);
    console.log(`High: $${prevDayResult.high.toFixed(2)} at ${prevDayResult.highTime.toISOString()}`);
    console.log(`Low: $${prevDayResult.low.toFixed(2)} at ${prevDayResult.lowTime.toISOString()}`);
    console.log(`Range: $${prevDayResult.range.toFixed(2)} (${prevDayResult.rangePercent.toFixed(2)}%)`);
    console.log(`Calculated at: ${prevDayResult.calculatedAt.toISOString()}\n`);

    // Example 2: Previous week high/low
    console.log('📊 Example 2: Previous Week High/Low');
    console.log('=====================================');
    
    const prevWeekResult = await indicatorService.getHighLowForPreviousPeriod(
      'ETH/USDT', 
      'week'
    );
    
    console.log(`Symbol: ${prevWeekResult.symbol}`);
    console.log(`Period: Previous Week`);
    console.log(`High: $${prevWeekResult.high.toFixed(2)} at ${prevWeekResult.highTime.toISOString()}`);
    console.log(`Low: $${prevWeekResult.low.toFixed(2)} at ${prevWeekResult.lowTime.toISOString()}`);
    console.log(`Range: $${prevWeekResult.range.toFixed(2)} (${prevWeekResult.rangePercent.toFixed(2)}%)`);
    console.log(`Calculated at: ${prevWeekResult.calculatedAt.toISOString()}\n`);

    // Example 3: Custom period high/low
    console.log('📊 Example 3: Custom Period High/Low');
    console.log('=====================================');
    
    const customConfig: HighLowIndicatorConfig = {
      symbol: 'BNB/USDT',
      period: {
        type: 'custom',
        startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        endTime: new Date()
      },
      useBodyHighLow: false,
      timezone: 'UTC'
    };
    
    const customResult = await indicatorService.calculateHighLow(customConfig);
    
    console.log(`Symbol: ${customResult.symbol}`);
    console.log(`Period: Custom (Last 7 days)`);
    console.log(`High: $${customResult.high.toFixed(2)} at ${customResult.highTime.toISOString()}`);
    console.log(`Low: $${customResult.low.toFixed(2)} at ${customResult.lowTime.toISOString()}`);
    console.log(`Range: $${customResult.range.toFixed(2)} (${customResult.rangePercent.toFixed(2)}%)`);
    console.log(`Calculated at: ${customResult.calculatedAt.toISOString()}\n`);

    // Example 4: Rolling period high/low (last 24 hours)
    console.log('📊 Example 4: Rolling 24 Hours High/Low');
    console.log('========================================');
    
    const rollingConfig: HighLowIndicatorConfig = {
      symbol: 'ADA/USDT',
      period: {
        type: 'rolling',
        periods: 24,
        interval: '1h'
      },
      useBodyHighLow: false
    };
    
    const rollingResult = await indicatorService.calculateHighLow(rollingConfig);
    
    console.log(`Symbol: ${rollingResult.symbol}`);
    console.log(`Period: Rolling 24 Hours`);
    console.log(`High: $${rollingResult.high.toFixed(4)} at ${rollingResult.highTime.toISOString()}`);
    console.log(`Low: $${rollingResult.low.toFixed(4)} at ${rollingResult.lowTime.toISOString()}`);
    console.log(`Range: $${rollingResult.range.toFixed(4)} (${rollingResult.rangePercent.toFixed(2)}%)`);
    console.log(`Calculated at: ${rollingResult.calculatedAt.toISOString()}\n`);

    // Example 5: Body high/low (using open/close instead of high/low)
    console.log('📊 Example 5: Body High/Low (Open/Close Range)');
    console.log('===============================================');
    
    const bodyConfig: HighLowIndicatorConfig = {
      symbol: 'SOL/USDT',
      period: 'prev_day',
      useBodyHighLow: true, // Use body high/low instead of wick high/low
      timezone: 'UTC'
    };
    
    const bodyResult = await indicatorService.calculateHighLow(bodyConfig);
    
    console.log(`Symbol: ${bodyResult.symbol}`);
    console.log(`Period: Previous Day (Body High/Low)`);
    console.log(`Body High: $${bodyResult.high.toFixed(2)} at ${bodyResult.highTime.toISOString()}`);
    console.log(`Body Low: $${bodyResult.low.toFixed(2)} at ${bodyResult.lowTime.toISOString()}`);
    console.log(`Body Range: $${bodyResult.range.toFixed(2)} (${bodyResult.rangePercent.toFixed(2)}%)`);
    console.log(`Calculated at: ${bodyResult.calculatedAt.toISOString()}\n`);

    // Example 6: Multiple indicators at once
    console.log('📊 Example 6: Multiple Indicators');
    console.log('==================================');
    
    const multipleConfigs: HighLowIndicatorConfig[] = [
      { symbol: 'BTC/USDT', period: 'current_day' },
      { symbol: 'ETH/USDT', period: 'current_day' },
      { symbol: 'BNB/USDT', period: 'current_day' },
      { symbol: 'ADA/USDT', period: 'current_day' }
    ];
    
    const multipleResults = await indicatorService.calculateMultipleHighLow(multipleConfigs);
    
    console.log('Current Day High/Low Summary:');
    multipleResults.forEach(result => {
      console.log(`${result.symbol}: High $${result.high.toFixed(2)}, Low $${result.low.toFixed(2)}, Range ${result.rangePercent.toFixed(2)}%`);
    });
    console.log('');

    // Example 7: All previous periods for one symbol
    console.log('📊 Example 7: All Previous Periods for BTC/USDT');
    console.log('================================================');
    
    const periods: Array<'day' | 'week' | 'month'> = ['day', 'week', 'month'];
    
    for (const period of periods) {
      const result = await indicatorService.getHighLowForPreviousPeriod('BTC/USDT', period);
      console.log(`Previous ${period}: High $${result.high.toFixed(2)}, Low $${result.low.toFixed(2)}, Range ${result.rangePercent.toFixed(2)}%`);
    }

    console.log('\n✅ All examples completed successfully!');

  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// Export the example function for potential testing
export { main };

// Run the example if this file is executed directly
if (require.main === module) {
  main();
}
