import { Container } from 'inversify';
import { CapitalComMarketDataProvider } from '../capitalcom-market-data.provider';
import { Logger } from '../../utils/logger';
import { MarketDataProviderConfig, RateLimiter } from '../../domain/interfaces/market-data.interfaces';
import { TYPES } from '../../config/types';
import axios, { AxiosInstance } from 'axios';

// Mock axios at the module level
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    request: jest.fn(),
    getUri: jest.fn(),
    interceptors: {
        request: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() }
    },
    defaults: {
        headers: {
            common: {}
        }
    }
} as unknown as jest.Mocked<AxiosInstance>;

describe('CapitalComMarketDataProvider', () => {
    let provider: CapitalComMarketDataProvider;
    let container: Container;
    let mockLogger: jest.Mocked<Logger>;
    let mockRateLimiter: jest.Mocked<RateLimiter>;
    let mockConfig: MarketDataProviderConfig;
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        
        // Store original environment
        originalEnv = { ...process.env };

        // Set environment variables needed for tests
        process.env.CAPITAL_COM_API_KEY = 'test-api-key';
        process.env.CAPITAL_COM_CUSTOM_PASS = 'test-password';
        
        // Reset mock instance methods
        mockAxiosInstance.get.mockReset();
        mockAxiosInstance.post.mockReset();
        mockAxiosInstance.delete.mockReset();
        
        // Reset axios mocks
        mockedAxios.create.mockReturnValue(mockAxiosInstance);

        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        } as any;

        mockRateLimiter = {
            checkLimit: jest.fn().mockResolvedValue(true),
            waitForLimit: jest.fn().mockResolvedValue(undefined),
            getRemainingRequests: jest.fn().mockReturnValue(1000),
            getResetTime: jest.fn().mockReturnValue(new Date())
        };

        mockConfig = {
            apiKey: 'test-api-key',
            apiSecret: 'test-api-secret',
            testnet: true,
            timeout: 5000,
        };

        provider = new CapitalComMarketDataProvider(mockLogger, mockRateLimiter);
    });

    afterEach(async () => {
        // Restore original environment variables
        process.env = originalEnv;
        jest.clearAllMocks();
        
        // Clean up provider if it was initialized
        if (provider) {
            try {
                await provider.disconnect();
            } catch (error) {
                // Ignore disconnect errors in cleanup
            }
        }
    });

    describe('initialize', () => {
        it('should initialize successfully', async () => {
            const mockAxiosInstance = mockedAxios.create();
            (mockAxiosInstance.get as jest.Mock).mockResolvedValueOnce({
                data: {
                    encryptionKey: 'test-key',
                    timeStamp: Date.now(),
                }
            });
            
            (mockAxiosInstance.post as jest.Mock).mockResolvedValueOnce({
                data: {
                    accountType: 'CFD',
                },
                headers: {
                    'cst': 'test-cst',
                    'x-security-token': 'test-security-token',
                }
            });

            await provider.initialize();

            expect(mockLogger.info).toHaveBeenCalledWith('CapitalCom provider initialized successfully');
            expect(mockRateLimiter.waitForLimit).toHaveBeenCalled();
        });

        it('should handle initialization errors', async () => {
            const mockError = new Error('API Error');
            const mockAxiosInstance = mockedAxios.create();
            (mockAxiosInstance.get as jest.Mock).mockRejectedValue(mockError);

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
                        netChange: 2.5,
                        percentageChange: 2.56,
                    },
                },
            };

            const mockAxiosInstance = mockedAxios.create();
            (mockAxiosInstance.get as jest.Mock).mockResolvedValue(mockResponse);

            const result = await provider.getMarketData('BTCUSD');

            expect(result).toEqual({
                symbol: 'BTCUSD',
                price: 100,
                timestamp: new Date('2025-06-03T10:00:00Z'),
                volume: 1000,
                change24h: 2.5,
                changePercent24h: 2.56,
            });
        });
    });

    describe('isHealthy', () => {
        it('should return true when service is healthy', async () => {
            mockAxiosInstance.get.mockResolvedValueOnce({ status: 200 });
            
            const result = await provider.isHealthy();
            expect(result).toBe(true);
        });

        it('should return false when service is unhealthy', async () => {
            mockAxiosInstance.get.mockRejectedValueOnce(new Error('Service unavailable'));
            
            const result = await provider.isHealthy();
            expect(result).toBe(false);
        });
    });

    describe('disconnect', () => {
        it('should disconnect successfully', async () => {
            mockAxiosInstance.delete.mockResolvedValueOnce({});
            
            await provider.disconnect();
            expect(mockLogger.info).not.toHaveBeenCalledWith('Error during logout');
        });
    });

    describe('retry mechanism', () => {
        beforeEach(async () => {
            // Setup mocks for initialization
            mockAxiosInstance.get.mockResolvedValueOnce({
                data: {
                    encryptionKey: 'test-key',
                    timeStamp: Date.now(),
                },
            });
            
            mockAxiosInstance.post.mockResolvedValueOnce({
                data: {
                    accountType: 'CFD',
                },
                headers: {
                    'cst': 'test-cst',
                    'x-security-token': 'test-security-token',
                },
            });

            await provider.initialize();
            mockLogger.warn.mockClear();
            mockRateLimiter.waitForLimit.mockClear();
        });

        it('should handle rate limit errors gracefully', async () => {
            // Mock rate limiter to simulate rate limit being exceeded
            mockRateLimiter.waitForLimit.mockRejectedValue(new Error('Rate limit exceeded'));

            await expect(provider.getMarketData('BTC/USDT')).rejects.toThrow('Rate limit exceeded');
            expect(mockRateLimiter.waitForLimit).toHaveBeenCalled();
        });
    });
});
