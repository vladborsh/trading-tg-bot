export enum AssetType {
  CRYPTO = 'CRYPTO',
  FOREX = 'FOREX',
  STOCK = 'STOCK',
  COMMODITY = 'COMMODITY',
}

export enum SignalType {
  BUY = 'BUY',
  SELL = 'SELL',
  HOLD = 'HOLD',
}

export enum SignalStrength {
  WEAK = 'WEAK',
  MODERATE = 'MODERATE',
  STRONG = 'STRONG',
}

export interface Asset {
  symbol: string;
  name: string;
  type: AssetType;
}

export interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: Date;
  change24h?: number;
  changePercent24h?: number;
}

export interface TradingSignal {
  id: string;
  asset: Asset;
  type: SignalType;
  strength: SignalStrength;
  price: number;
  timestamp: Date;
  confidence: number; // 0-100
  reason: string;
  metadata?: Record<string, unknown>;
}
