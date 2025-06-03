/**
 * Example usage of the Binance Market Data Provider
 * 
 * This example demonstrates how to use the generic MarketDataProvider interface
 * with the Binance implementation to fetch market data.
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { MarketDataProvider } from '../domain/interfaces/market-data.interfaces';
import { BinanceMarketDataProvider } from '../data/binance-market-data.provider';
import { InMemoryMarketDataCache } from '../services/market-data-cache.service';
import { TokenBucketRateLimiter } from '../services/rate-limiter.service';
import { TYPES } from '../config/types';

// Mock logger for example
const mockLogger = {
  info: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.debug
} as any;

async function main() {
  try {
    // Setup container
    const container = new Container();
    
    // Register services
    container.bind(TYPES.Logger).toConstantValue(mockLogger);
    container.bind(TYPES.MarketDataCache).to(InMemoryMarketDataCache);
    container.bind(TYPES.RateLimiter).to(TokenBucketRateLimiter);
    container.bind(BinanceMarketDataProvider).toSelf().inSingletonScope();
    container.bind<MarketDataProvider>(TYPES.BinanceProvider).to(BinanceMarketDataProvider);

    // Get provider instance
    const provider = container.get<MarketDataProvider>(TYPES.BinanceProvider);
    
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
    console.log('\nFetching BTC/USDT market data...');
    const btcData = await provider.getMarketData('BTC/USDT');
    console.log('BTC/USDT:', {
      price: btcData.price,
      volume: btcData.volume,
      change24h: btcData.changePercent24h
    });

    // Fetch 24h ticker
    console.log('\nFetching BTC/USDT 24h ticker...');
    const ticker = await provider.getTicker24h('BTC/USDT');
    console.log('24h Ticker:', {
      open: ticker.openPrice,
      high: ticker.highPrice,
      low: ticker.lowPrice,
      close: ticker.lastPrice,
      volume: ticker.volume,
      change: `${ticker.priceChangePercent.toFixed(2)}%`
    });

    // Fetch klines
    console.log('\nFetching BTC/USDT 1-hour klines...');
    const klines = await provider.getKlines('BTC/USDT', '1h', 5);
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
