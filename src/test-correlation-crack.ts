/**
 * Simple test script for correlation-crack strategy
 */
import 'reflect-metadata';
import { CorrelationCrackStrategy } from './core/strategies/correlation-crack.strategy';
import { HighLowIndicator } from './core/indicators/high-low.indicator';
import { CorrelationCrackConfig, CrossDirection } from './core/strategies/strategy.interfaces';
import { MarketDataProvider, Kline } from './domain/interfaces/market-data.interfaces';
import { HighLowResult } from './core/indicators/indicator.interfaces';
import { Logger } from 'winston';

// Mock implementations for testing
class MockMarketDataProvider implements MarketDataProvider {
  getName(): string { return 'MockProvider'; }
  
  async getMarketData(): Promise<any> { return null; }
  
  async getKlines(): Promise<Kline[]> {
    return [
      {
        symbol: 'EURUSD',
        openTime: new Date('2025-01-01T10:00:00Z'),
        closeTime: new Date('2025-01-01T10:05:00Z'),
        open: 1.1000,
        high: 1.1020,
        low: 1.0980,
        close: 1.1010,
        volume: 1000,
        trades: 10
      },
      {
        symbol: 'EURUSD',
        openTime: new Date('2025-01-01T10:05:00Z'),
        closeTime: new Date('2025-01-01T10:10:00Z'),
        open: 1.1010,
        high: 1.1050,
        low: 1.0990,
        close: 1.1040,
        volume: 1200,
        trades: 12
      }
    ];
  }
  
  async getTicker24h(): Promise<any> { return null; }
  async isHealthy(): Promise<boolean> { return true; }
  async initialize(): Promise<void> {}
  async disconnect(): Promise<void> {}
}

class MockHighLowIndicator {
  getName(): string { return 'HighLowIndicator'; }
  validate(): boolean { return true; }
  getRequiredDataPoints(): number { return 1; }
  
  async calculate(): Promise<HighLowResult> {
    return {
      symbol: 'EURUSD',
      interval: '5m',
      period: 'prev_day',
      high: 1.1050,
      low: 1.0980,
      highTime: new Date('2025-01-01T10:05:00Z'),
      lowTime: new Date('2025-01-01T10:00:00Z'),
      range: 0.0070,
      rangePercent: 0.64,
      calculatedAt: new Date()
    };
  }
}

class MockLogger {
  info(...args: any[]): void { console.log('INFO:', ...args); }
  error(...args: any[]): void { console.error('ERROR:', ...args); }
  warn(...args: any[]): void { console.warn('WARN:', ...args); }
  debug(...args: any[]): void { console.debug('DEBUG:', ...args); }
}

async function testCorrelationCrackStrategy(): Promise<void> {
  console.log('🧪 Testing Correlation Crack Strategy...\n');

  const mockLogger = new MockLogger() as any as Logger;
  const mockProvider = new MockMarketDataProvider();
  const mockIndicator = new MockHighLowIndicator() as any;

  const strategy = new CorrelationCrackStrategy(
    mockIndicator,
    mockProvider,
    mockLogger
  );

  console.log('✅ Strategy instantiated successfully');
  console.log(`Strategy name: ${strategy.getName()}\n`);

  // Test configuration validation
  console.log('🔍 Testing configuration validation...');
  
  const validConfig: CorrelationCrackConfig = {
    primaryAssets: ['EURUSD', 'EURGBP'],
    period: 'prev_day',
    direction: CrossDirection.CROSS_UNDER
  };

  const isValid = strategy.validate(validConfig);
  console.log(`Valid config test: ${isValid ? '✅ PASS' : '❌ FAIL'}\n`);

  // Test invalid configuration
  const invalidConfig: CorrelationCrackConfig = {
    primaryAssets: ['EURUSD'], // Only one asset - should fail
    period: 'prev_day',
    direction: CrossDirection.CROSS_UNDER
  };

  const isInvalid = !strategy.validate(invalidConfig);
  console.log(`Invalid config test: ${isInvalid ? '✅ PASS' : '❌ FAIL'}\n`);

  // Test cross condition detection
  console.log('🔍 Testing cross condition detection...');
  
  const testKlines: Kline[] = [
    {
      symbol: 'EURUSD',
      openTime: new Date('2025-01-01T10:00:00Z'),
      closeTime: new Date('2025-01-01T10:05:00Z'),
      open: 1.1000,
      high: 1.1020,
      low: 1.0980,
      close: 1.1050, // Above reference
      volume: 1000,
      trades: 10
    },
    {
      symbol: 'EURUSD',
      openTime: new Date('2025-01-01T10:05:00Z'),
      closeTime: new Date('2025-01-01T10:10:00Z'),
      open: 1.1050,
      high: 1.1060,
      low: 1.0990,
      close: 1.0990, // Below reference - should detect cross-under
      volume: 1200,
      trades: 12
    }
  ];

  const crossResult = await strategy.checkCrossCondition(
    testKlines, 
    1.1000, // Reference level
    CrossDirection.CROSS_UNDER
  );

  console.log(`Cross-under detection: ${crossResult.hasCrossed ? '✅ PASS' : '❌ FAIL'}`);
  if (crossResult.hasCrossed && crossResult.crossTime) {
    console.log(`Cross time: ${crossResult.crossTime.toISOString()}\n`);
  }

  // Test strategy execution
  console.log('🚀 Testing strategy execution...');
  
  try {
    const result = await strategy.execute(validConfig);
    console.log(`Strategy execution: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Strategy name in result: ${result.strategyName}`);
    console.log(`Execution time: ${result.executedAt.toISOString()}`);
    
    if (result.metadata) {
      console.log(`Assets analyzed: ${result.metadata.assetsAnalyzed}`);
    }
    
    if (result.signal) {
      console.log(`\n🎯 Signal generated:`);
      console.log(`Direction: ${result.signal.direction}`);
      console.log(`Trigger asset: ${result.signal.triggerAsset}`);
      console.log(`Confidence: ${(result.signal.confidence * 100).toFixed(1)}%`);
    } else {
      console.log('No signal generated (expected for mock data)');
    }
    
  } catch (error) {
    console.error('❌ Strategy execution failed:', error);
  }

  console.log('\n🎉 All tests completed!');
}

// Run the test
testCorrelationCrackStrategy().catch(console.error);
