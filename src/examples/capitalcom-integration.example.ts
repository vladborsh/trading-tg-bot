/**
 * Example usage of the Capital.com Market Data Provider
 * 
 * This example demonstrates how to use the generic MarketDataProvider interface
 * with the Capital.com implementation to fetch market data.
 */

import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { Container } from 'inversify';
import { MarketDataProvider } from '../domain/interfaces/market-data.interfaces';
import { CapitalComMarketDataProvider } from '../data/capitalcom-market-data.provider';
import { InMemoryMarketDataCache } from '../services/market-data-cache.service';
import { TokenBucketRateLimiter } from '../services/rate-limiter.service';
import { TYPES } from '../config/types';

// Load environment variables
dotenv.config();

// Mock logger for example
const mockLogger = {
  info: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.debug
} as any;

async function main() {
  // Ensure environment variables are set
  if (!process.env.CAPITAL_COM_API_KEY || !process.env.CAPITAL_COM_CUSTOM_PASS) {
    console.error('Environment variables not found. Please check that:');
    console.error('1. You have a .env file in the project root');
    console.error('2. The .env file contains:');
    console.error('   CAPITAL_COM_API_KEY=your_api_key');
    console.error('   CAPITAL_COM_CUSTOM_PASS=your_custom_password');
    return;
  }

  try {
    // Setup container
    const container = new Container();
    
    // Register services
    container.bind(TYPES.Logger).toConstantValue(mockLogger);
    container.bind(TYPES.MarketDataCache).to(InMemoryMarketDataCache);
    container.bind(TYPES.RateLimiter).to(TokenBucketRateLimiter);
    container.bind(CapitalComMarketDataProvider).toSelf().inSingletonScope();
    container.bind<MarketDataProvider>(TYPES.CapitalComProvider).to(CapitalComMarketDataProvider);

    // Get provider instance
    const provider = container.get<MarketDataProvider>(TYPES.CapitalComProvider);
    
    console.log(`Initializing ${provider.getName()} provider...`);
    await provider.initialize();
    
    // Check health
    const isHealthy = await provider.isHealthy();
    console.log(`Provider health status: ${isHealthy ? 'Healthy' : 'Unhealthy'}`);
    
    if (!isHealthy) {
      console.log('Provider is not healthy, exiting...');
      return;
    }

    // Fetch market data
    console.log('\nFetching BTC/USD market data...');
    const btcData = await provider.getMarketData('BTC/USD');
    console.log('BTC/USD:', {
      price: btcData.price,
      volume: btcData.volume,
      change24h: btcData.changePercent24h,
      timestamp: btcData.timestamp
    });

    // Fetch 24h ticker
    console.log('\nFetching BTC/USD 24h ticker...');
    const ticker = await provider.getTicker24h('BTC/USD');
    console.log('24h Ticker:', {
      bidPrice: ticker.bidPrice,
      askPrice: ticker.askPrice,
      high: ticker.highPrice,
      low: ticker.lowPrice,
      lastPrice: ticker.lastPrice,
      volume: ticker.volume,
      change: `${ticker.priceChangePercent.toFixed(2)}%`
    });

    // Fetch klines
    console.log('\nFetching BTC/USD 1-hour klines...');
    const klines = await provider.getKlines('BTC/USD', '1h', 5);
    klines.forEach((kline, index) => {
      console.log(`Kline ${index + 1}: O:${kline.open} H:${kline.high} L:${kline.low} C:${kline.close} V:${kline.volume}`);
    });

    // Cleanup
    console.log('\nDisconnecting from provider...');
    await provider.disconnect();
    console.log('Example completed successfully!');

  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Export the example function for potential testing
export { main };

// Run the example if this file is executed directly
if (require.main === module) {
  main();
}
