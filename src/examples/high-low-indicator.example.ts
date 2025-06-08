/**
 * Example usage of High/Low Indicator
 * 
 * This example demonstrates how to use the High/Low indicator
 * to calculate high and low prices for various time periods.
 */

import 'reflect-metadata';
import { HighLowIndicator } from '../core/indicators/high-low.indicator';
import { HighLowIndicatorConfig } from '../core/indicators/indicator.interfaces';
import { MarketDataProvider } from '../domain/interfaces/market-data.interfaces';
import { TYPES } from '../config/types';
import { setupContainer } from '../config/inversify.config';

async function main() {
  console.log('🎯 High/Low Indicator Example\n');

  try {
    // Setup dependency injection container for market data provider
    const container = setupContainer();
    
    // Get the market data provider 
    const marketDataProvider = container.get<MarketDataProvider>(TYPES.MarketDataProvider);
    
    // Create indicator instance (no dependencies needed)
    const indicator = new HighLowIndicator();

    // Example 1: Previous day high/low project,
    console.log('📊 Example 1: Previous Day High/Low');
    console.log('=====================================');
    
    // Fetch market data for BTC/USDT
    const btcData = await marketDataProvider.getKlines('BTC/USDT', '1h', 48); // 2 days of hourly data
    
    const prevDayConfig: HighLowIndicatorConfig = {
      symbol: 'BTC/USDT',
      period: 'prev_day'
    };
    
    const prevDayResult = await indicator.calculate(btcData, prevDayConfig);
    
    console.log(`Symbol: ${prevDayResult.symbol}`);
    console.log(`Period: Previous Day`);
    console.log(`High: $${prevDayResult.high.toFixed(2)} at ${prevDayResult.highTime.toISOString()}`);
    console.log(`Low: $${prevDayResult.low.toFixed(2)} at ${prevDayResult.lowTime.toISOString()}`);
    console.log(`Range: $${prevDayResult.range.toFixed(2)} (${prevDayResult.rangePercent.toFixed(2)}%)`);
    console.log(`Calculated at: ${prevDayResult.calculatedAt.toISOString()}\n`);

    // Example 2: Previous week high/low
    console.log('📊 Example 2: Previous Week High/Low');
    console.log('=====================================');
    
    // Fetch more data for weekly analysis
    const ethData = await marketDataProvider.getKlines('ETH/USDT', '4h', 84); // 2 weeks of 4-hour data
    
    const prevWeekConfig: HighLowIndicatorConfig = {
      symbol: 'ETH/USDT',
      period: 'prev_week'
    };
    
    const prevWeekResult = await indicator.calculate(ethData, prevWeekConfig);
    
    console.log(`Symbol: ${prevWeekResult.symbol}`);
    console.log(`Period: Previous Week`);
    console.log(`High: $${prevWeekResult.high.toFixed(2)} at ${prevWeekResult.highTime.toISOString()}`);
    console.log(`Low: $${prevWeekResult.low.toFixed(2)} at ${prevWeekResult.lowTime.toISOString()}`);
    console.log(`Range: $${prevWeekResult.range.toFixed(2)} (${prevWeekResult.rangePercent.toFixed(2)}%)`);
    console.log(`Calculated at: ${prevWeekResult.calculatedAt.toISOString()}\n`);

    // Example 3: Custom period high/low
    console.log('📊 Example 3: Custom Period High/Low');
    console.log('=====================================');
    
    // Fetch data for BNB/USDT for custom period
    const bnbData = await marketDataProvider.getKlines('BNB/USDT', '1h', 168); // 7 days of hourly data
    
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
    
    const customResult = await indicator.calculate(bnbData, customConfig);
    
    console.log(`Symbol: ${customResult.symbol}`);
    console.log(`Period: Custom (Last 7 days)`);
    console.log(`High: $${customResult.high.toFixed(2)} at ${customResult.highTime.toISOString()}`);
    console.log(`Low: $${customResult.low.toFixed(2)} at ${customResult.lowTime.toISOString()}`);
    console.log(`Range: $${customResult.range.toFixed(2)} (${customResult.rangePercent.toFixed(2)}%)`);
    console.log(`Calculated at: ${customResult.calculatedAt.toISOString()}\n`);

    // Example 4: Rolling period high/low (last 24 hours)
    console.log('📊 Example 4: Rolling 24 Hours High/Low');
    console.log('========================================');
    
    // Fetch data for ADA/USDT for rolling analysis
    const adaData = await marketDataProvider.getKlines('ADA/USDT', '1h', 24); // 24 hours of hourly data
    
    const rollingConfig: HighLowIndicatorConfig = {
      symbol: 'ADA/USDT',
      period: {
        type: 'rolling',
        periods: 24,
        interval: '1h'
      },
      useBodyHighLow: false
    };
    
    const rollingResult = await indicator.calculate(adaData, rollingConfig);
    
    console.log(`Symbol: ${rollingResult.symbol}`);
    console.log(`Period: Rolling 24 Hours`);
    console.log(`High: $${rollingResult.high.toFixed(4)} at ${rollingResult.highTime.toISOString()}`);
    console.log(`Low: $${rollingResult.low.toFixed(4)} at ${rollingResult.lowTime.toISOString()}`);
    console.log(`Range: $${rollingResult.range.toFixed(4)} (${rollingResult.rangePercent.toFixed(2)}%)`);
    console.log(`Calculated at: ${rollingResult.calculatedAt.toISOString()}\n`);

    // Example 5: Body high/low (using open/close instead of high/low)
    console.log('📊 Example 5: Body High/Low (Open/Close Range)');
    console.log('===============================================');
    
    // Fetch data for SOL/USDT
    const solData = await marketDataProvider.getKlines('SOL/USDT', '1h', 48); // 2 days of hourly data
    
    const bodyConfig: HighLowIndicatorConfig = {
      symbol: 'SOL/USDT',
      period: 'prev_day',
      useBodyHighLow: true, // Use body high/low instead of wick high/low
      timezone: 'UTC'
    };
    
    const bodyResult = await indicator.calculate(solData, bodyConfig);
    
    console.log(`Symbol: ${bodyResult.symbol}`);
    console.log(`Period: Previous Day (Body High/Low)`);
    console.log(`Body High: $${bodyResult.high.toFixed(2)} at ${bodyResult.highTime.toISOString()}`);
    console.log(`Body Low: $${bodyResult.low.toFixed(2)} at ${bodyResult.lowTime.toISOString()}`);
    console.log(`Body Range: $${bodyResult.range.toFixed(2)} (${bodyResult.rangePercent.toFixed(2)}%)`);
    console.log(`Calculated at: ${bodyResult.calculatedAt.toISOString()}\n`);

    // Example 6: Multiple indicators at once
    console.log('📊 Example 6: Multiple Indicators');
    console.log('==================================');
    
    const symbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT'];
    const multipleResults = [];
    
    // Process each symbol sequentially to avoid rate limits
    for (const symbol of symbols) {
      const data = await marketDataProvider.getKlines(symbol, '1h', 24); // Current day data
      const config: HighLowIndicatorConfig = {
        symbol,
        period: 'current_day'
      };
      const result = await indicator.calculate(data, config);
      multipleResults.push(result);
    }
    
    console.log('Current Day High/Low Summary:');
    multipleResults.forEach(result => {
      console.log(`${result.symbol}: High $${result.high.toFixed(2)}, Low $${result.low.toFixed(2)}, Range ${result.rangePercent.toFixed(2)}%`);
    });
    console.log('');

    // Example 7: All previous periods for one symbol
    console.log('📊 Example 7: All Previous Periods for BTC/USDT');
    console.log('================================================');
    
    const periods = [
      { name: 'day', period: 'prev_day' as const, interval: '1h', limit: 48 },
      { name: 'week', period: 'prev_week' as const, interval: '4h', limit: 84 },
      { name: 'month', period: 'prev_month' as const, interval: '1d', limit: 62 }
    ];
    
    for (const { name, period, interval, limit } of periods) {
      const data = await marketDataProvider.getKlines('BTC/USDT', interval, limit);
      const config: HighLowIndicatorConfig = {
        symbol: 'BTC/USDT',
        period
      };
      const result = await indicator.calculate(data, config);
      console.log(`Previous ${name}: High $${result.high.toFixed(2)}, Low $${result.low.toFixed(2)}, Range ${result.rangePercent.toFixed(2)}%`);
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
