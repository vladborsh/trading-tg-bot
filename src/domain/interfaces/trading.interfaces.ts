export interface MarketDataProvider {
  getName(): string;
  getMarketData(symbol: string): Promise<MarketData>;
  getMultipleMarketData(symbols: string[]): Promise<MarketData[]>;
  isHealthy(): Promise<boolean>;
}

export interface SignalProcessor {
  processSignal(marketData: MarketData): Promise<TradingSignal | null>;
  getProcessingLatency(): number;
}

export interface NotificationService {
  sendSignal(signal: TradingSignal): Promise<void>;
  sendMessage(message: string): Promise<void>;
  sendChart(chartData: ChartData): Promise<void>;
}

export interface ChartData {
  title: string;
  data: Array<{ x: string | number; y: number }>;
  type: 'line' | 'bar' | 'candlestick';
}

import { MarketData, TradingSignal } from '../entities/trading.entities';
