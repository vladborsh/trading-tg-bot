import { MarketData, TradingSignal } from '../entities/trading.entities';

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
