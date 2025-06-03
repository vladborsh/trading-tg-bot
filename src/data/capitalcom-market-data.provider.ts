import { inject, injectable } from 'inversify';
import { MarketData } from '../domain/entities/trading.entities';
import { 
    MarketDataProvider, 
    MarketDataProviderConfig, 
    Kline, 
    Ticker24h,
    RateLimiter 
} from '../domain/interfaces/market-data.interfaces';
import { Logger } from '../utils/logger';
import { TYPES } from '../config/types';
import axios, { AxiosInstance, AxiosError } from 'axios';
import WebSocket from 'ws';

interface CapitalComMarketResponse {
    snapshot: {
        bid: number;
        offer: number;
        updateTime: string;
        updateTimeUTC: string;
        scalingFactor: number;
        status: string;
        netChange: number;
        percentageChange: number;
        high: number;
        low: number;
    };
}

@injectable()
export class CapitalComMarketDataProvider implements MarketDataProvider {
    private readonly baseUrl: string;
    private readonly demoBaseUrl: string = 'https://demo-api-capital.backend-capital.com';
    private readonly liveBaseUrl: string = 'https://api-capital.backend-capital.com';
    private readonly wsBaseUrl: string = 'wss://api-streaming-capital.backend-capital.com/connect';
    
    private http: AxiosInstance;
    private wsClient: WebSocket | null = null;
    private isConnected: boolean = false;
    private sessionTokens: {
        cst: string;
        securityToken: string;
    } | null = null;

    private readonly config: Required<MarketDataProviderConfig>;

    constructor(
        @inject(TYPES.Logger) private readonly logger: Logger,
        @inject(TYPES.RateLimiter) private readonly rateLimiter: RateLimiter
    ) {
        // Validate required environment variables
        if (!process.env.CAPITAL_COM_API_KEY || !process.env.CAPITAL_COM_CUSTOM_PASS) {
            throw new Error('Capital.com API key and custom password are required');
        }

        this.config = {
            apiKey: process.env.CAPITAL_COM_API_KEY,
            apiSecret: process.env.CAPITAL_COM_CUSTOM_PASS,
            identifier: process.env.CAPITAL_COM_IDENTIFIER || '', // Provide empty string as default
            testnet: process.env.NODE_ENV !== 'production',
            timeout: 10000,
            rateLimitRequests: 10,
            rateLimitInterval: 1000,
            retryAttempts: 3,
            retryDelay: 1000,
        };
        
        this.baseUrl = this.config.testnet ? this.demoBaseUrl : this.liveBaseUrl;
        this.http = axios.create({
            baseURL: this.baseUrl,
            timeout: this.config.timeout || 10000,
        });
    }

    getName(): string {
        return 'CapitalCom';
    }

    async initialize(): Promise<void> {
        try {
            await this.rateLimiter.waitForLimit();

            // First get encryption key if using encrypted password
            const { data: encKeyData } = await this.http.get('/api/v1/session/encryptionKey', {
                headers: {
                    'X-CAP-API-KEY': this.config.apiKey,
                },
            });

            // Create session
            const { data: sessionData, headers } = await this.http.post('/api/v1/session', {
                identifier: this.config.identifier, // Using the actual identifier
                password: this.config.apiSecret,    // Using the custom password
                encryptedPassword: false,
            }, {
                headers: {
                    'X-CAP-API-KEY': this.config.apiKey,  // API key stays in headers
                },
            });

            this.sessionTokens = {
                cst: headers['cst'],
                securityToken: headers['x-security-token'],
            };

            this.setupAxiosDefaults();
            await this.initializeWebSocket();
            
            this.logger.info('CapitalCom provider initialized successfully');
            this.isConnected = true;
        } catch (error) {
            this.logger.error('Failed to initialize CapitalCom provider', { error });
            throw error;
        }
    }

    private setupAxiosDefaults(): void {
        if (!this.sessionTokens) {
            throw new Error('Session tokens not available');
        }

        this.http.defaults.headers.common['CST'] = this.sessionTokens.cst;
        this.http.defaults.headers.common['X-SECURITY-TOKEN'] = this.sessionTokens.securityToken;
    }

    private async initializeWebSocket(): Promise<void> {
        if (!this.sessionTokens) {
            throw new Error('Session tokens not available');
        }

        this.wsClient = new WebSocket(this.wsBaseUrl);
        
        this.wsClient.onopen = () => {
            this.logger.info('WebSocket connected');
            // Setup ping interval to keep connection alive
            setInterval(() => this.pingWebSocket(), 9 * 60 * 1000); // Ping every 9 minutes
        };

        this.wsClient.onclose = () => {
            this.logger.warn('WebSocket connection closed');
            this.isConnected = false;
        };

        this.wsClient.onerror = (error) => {
            this.logger.error('WebSocket error', { error });
        };
    }

    private pingWebSocket(): void {
        if (!this.wsClient || !this.sessionTokens) return;

        const pingMessage = {
            destination: 'ping',
            correlationId: Date.now().toString(),
            cst: this.sessionTokens.cst,
            securityToken: this.sessionTokens.securityToken,
        };

        this.wsClient.send(JSON.stringify(pingMessage));
    }

    async getMarketData(symbol: string): Promise<MarketData> {
        await this.rateLimiter.waitForLimit();
        
        try {
            const { data } = await this.http.get<CapitalComMarketResponse>(`/api/v1/markets/${symbol}`);
            
            return {
                symbol,
                price: data.snapshot.bid,
                timestamp: new Date(data.snapshot.updateTime),
                volume: data.snapshot.scalingFactor || 0,
                change24h: data.snapshot.netChange,
                changePercent24h: data.snapshot.percentageChange,
            };
        } catch (error: unknown) {
            const axiosError = error as AxiosError;
            this.logger.error('Failed to get market data', { symbol, error: axiosError.message });
            throw error;
        }
    }

    async getKlines(symbol: string, interval: string, limit: number = 10): Promise<Kline[]> {
        try {
            const resolution = this.mapIntervalToResolution(interval);
            const { data } = await this.http.get(`/api/v1/prices/${symbol}`, {
                params: {
                    resolution,
                    max: limit,
                },
            });

            return data.prices.map((price: any) => ({
                symbol,
                openTime: new Date(price.snapshotTime),
                closeTime: new Date(price.snapshotTimeUTC),
                open: price.openPrice,
                high: price.highPrice,
                low: price.lowPrice,
                close: price.closePrice,
                volume: price.lastTradedVolume,
                trades: 0, // Not provided by Capital.com
            }));
        } catch (error) {
            this.logger.error('Failed to get klines', { symbol, interval, error });
            throw error;
        }
    }

    private mapIntervalToResolution(interval: string): string {
        const map: { [key: string]: string } = {
            '1m': 'MINUTE',
            '5m': 'MINUTE_5',
            '15m': 'MINUTE_15',
            '30m': 'MINUTE_30',
            '1h': 'HOUR',
            '4h': 'HOUR_4',
            '1d': 'DAY',
            '1w': 'WEEK',
        };
        return map[interval] || 'MINUTE';
    }

    async getTicker24h(symbol: string): Promise<Ticker24h> {
        try {
            const { data } = await this.http.get(`/api/v1/markets/${symbol}`);
            const snapshot = data.snapshot;

            return {
                symbol,
                priceChange: snapshot.netChange,
                priceChangePercent: snapshot.percentageChange,
                weightedAvgPrice: 0, // Not provided by Capital.com
                prevClosePrice: 0, // Not provided
                lastPrice: snapshot.bid,
                lastQty: 0, // Not provided
                bidPrice: snapshot.bid,
                askPrice: snapshot.offer,
                openPrice: 0, // Not provided
                highPrice: snapshot.high,
                lowPrice: snapshot.low,
                volume: snapshot.scalingFactor || 0,
                quoteVolume: 0, // Not provided
                openTime: new Date(snapshot.updateTime),
                closeTime: new Date(snapshot.updateTimeUTC),
                count: 0, // Not provided
            };
        } catch (error) {
            this.logger.error('Failed to get 24h ticker', { symbol, error });
            throw error;
        }
    }

    async isHealthy(): Promise<boolean> {
        try {
            await this.http.get('/api/v1/ping');
            return true;
        } catch (error) {
            this.logger.error('Health check failed', { error });
            return false;
        }
    }

    async disconnect(): Promise<void> {
        if (this.wsClient) {
            this.wsClient.close();
            this.wsClient = null;
        }
        
        if (this.sessionTokens) {
            try {
                await this.http.delete('/api/v1/session');
            } catch (error) {
                this.logger.error('Error during logout', { error });
            }
        }

        this.isConnected = false;
        this.sessionTokens = null;
    }
}
