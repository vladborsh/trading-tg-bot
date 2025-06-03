import { Container } from 'inversify';
import { CapitalComMarketDataProvider } from '../capitalcom-market-data.provider';
import { Logger } from '../../utils/logger';
import { MarketDataProviderConfig } from '../../domain/interfaces/market-data.interfaces';
import { TYPES } from '../../config/types';

describe('CapitalComMarketDataProvider', () => {
    let provider: CapitalComMarketDataProvider;
    let container: Container;
    let mockLogger: jest.Mocked<Logger>;
    let mockConfig: MarketDataProviderConfig;

    beforeEach(() => {
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        } as any;

        mockConfig = {
            apiKey: 'test-api-key',
            apiSecret: 'test-api-secret',
            testnet: true,
            timeout: 5000,
        };

        container = new Container();
        container.bind<Logger>(TYPES.Logger).toConstantValue(mockLogger);
        container.bind<MarketDataProviderConfig>(TYPES.MarketDataConfig).toConstantValue(mockConfig);
        container.bind(CapitalComMarketDataProvider).toSelf();

        provider = container.get(CapitalComMarketDataProvider);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('initialize', () => {
        it('should initialize successfully', async () => {
            // Mock axios responses
            const mockAxiosCreate = jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({
                    data: {
                        encryptionKey: 'test-key',
                        timeStamp: Date.now(),
                    },
                }),
                post: jest.fn().mockResolvedValue({
                    data: {
                        accountType: 'CFD',
                    },
                    headers: {
                        'cst': 'test-cst',
                        'x-security-token': 'test-security-token',
                    },
                }),
                defaults: {
                    headers: {
                        common: {},
                    },
                },
            });

            (global as any).axios = {
                create: mockAxiosCreate,
            };

            await provider.initialize();

            expect(mockLogger.info).toHaveBeenCalledWith('CapitalCom provider initialized successfully');
        });

        it('should handle initialization errors', async () => {
            const mockError = new Error('API Error');
            const mockAxiosCreate = jest.fn().mockReturnValue({
                get: jest.fn().mockRejectedValue(mockError),
            });

            (global as any).axios = {
                create: mockAxiosCreate,
            };

            await expect(provider.initialize()).rejects.toThrow();
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize CapitalCom provider', { error: mockError });
        });
    });

    describe('getMarketData', () => {
        it('should fetch market data successfully', async () => {
            const mockResponse = {
                data: {
                    snapshot: {
                        bid: 100,
                        offer: 101,
                        updateTime: '2025-06-03T10:00:00Z',
                        scalingFactor: 1000,
                        marketStatus: 'OPEN',
                    },
                },
            };

            const mockAxiosCreate = jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue(mockResponse),
            });

            (global as any).axios = {
                create: mockAxiosCreate,
            };

            const result = await provider.getMarketData('BTCUSD');

            expect(result).toEqual({
                symbol: 'BTCUSD',
                price: {
                    bid: 100,
                    ask: 101,
                    last: 100.5,
                },
                timestamp: new Date('2025-06-03T10:00:00Z'),
                volume: 1000,
                marketStatus: 'OPEN',
            });
        });
    });

    describe('isHealthy', () => {
        it('should return true when service is healthy', async () => {
            const mockAxiosCreate = jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({ status: 200 }),
            });

            (global as any).axios = {
                create: mockAxiosCreate,
            };

            const result = await provider.isHealthy();
            expect(result).toBe(true);
        });

        it('should return false when service is unhealthy', async () => {
            const mockAxiosCreate = jest.fn().mockReturnValue({
                get: jest.fn().mockRejectedValue(new Error('Service unavailable')),
            });

            (global as any).axios = {
                create: mockAxiosCreate,
            };

            const result = await provider.isHealthy();
            expect(result).toBe(false);
        });
    });

    describe('disconnect', () => {
        it('should disconnect successfully', async () => {
            const mockAxiosCreate = jest.fn().mockReturnValue({
                delete: jest.fn().mockResolvedValue({}),
            });

            (global as any).axios = {
                create: mockAxiosCreate,
            };

            await provider.disconnect();
            expect(mockLogger.info).not.toHaveBeenCalledWith('Error during logout');
        });
    });
});
