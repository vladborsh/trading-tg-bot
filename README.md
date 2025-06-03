# Trading Bot System

Production-grade TypeScript/Node.js trading analysis service with Telegram integration.

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Development**
   ```bash
   npm run dev
   ```

## Market Data Integration

### Overview

The system implements a generic `MarketDataProvider` interface that allows seamless integration with multiple cryptocurrency exchanges. This design enables easy addition of new exchanges without changing the core business logic.

### Key Features

- **Exchange Agnostic**: Common interface for all market data providers
- **Built-in Rate Limiting**: Token bucket algorithm to respect API limits
- **Intelligent Caching**: TTL-based caching for improved performance
- **Error Handling**: Automatic retry with exponential backoff
- **Health Monitoring**: Real-time provider health checking
- **Type Safety**: Full TypeScript support with strict typing

### Supported Exchanges

- **Binance**: Production-ready integration using CCXT library

### Usage Example

```typescript
import { MarketDataProvider } from './domain/interfaces/market-data.interfaces';
import { TYPES } from './config/types';

// Get provider from DI container
const provider = container.get<MarketDataProvider>(TYPES.BinanceProvider);
await provider.initialize();

// Fetch market data
const marketData = await provider.getMarketData('BTC/USDT');
console.log(`BTC Price: $${marketData.price}`);

// Fetch multiple symbols
const symbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'];
const multipleData = await provider.getMultipleMarketData(symbols);

// Get order book
const orderBook = await provider.getOrderBook('BTC/USDT', 100);

// Get candlestick data
const klines = await provider.getKlines('BTC/USDT', '1h', 24);

// Get 24h ticker statistics
const ticker = await provider.getTicker24h('BTC/USDT');
```

### Adding New Exchange Providers

1. **Implement the interface**:
   ```typescript
   class NewExchangeProvider implements MarketDataProvider {
     // Implement all required methods
   }
   ```

2. **Register with DI container**:
   ```typescript
   container.bind<MarketDataProvider>(TYPES.NewExchangeProvider)
     .to(NewExchangeProvider)
     .inSingletonScope();
   ```

3. **Add comprehensive tests**:
   ```typescript
   describe('NewExchangeProvider', () => {
     // Test all methods with >80% coverage
   });
   ```

### Configuration

Market data providers support various configuration options:

```typescript
interface MarketDataProviderConfig {
  apiKey?: string;           // Exchange API key
  apiSecret?: string;        // Exchange API secret
  testnet?: boolean;         // Use testnet/sandbox
  rateLimitRequests?: number; // Max requests per interval
  rateLimitInterval?: number; // Rate limit window (ms)
  timeout?: number;          // Request timeout (ms)
  retryAttempts?: number;    // Max retry attempts
  retryDelay?: number;       // Base retry delay (ms)
}
```

4. **Build for production**
   ```bash
   npm run build
   npm start
   ```

## Project Structure

```
src/
├── bot/          # Telegram bot interface
├── config/       # Environment configuration, DI setup
├── core/         # Trading logic, indicators
├── data/         # Market data integrations
├── domain/       # Core entities, interfaces
├── services/     # Supporting services
├── utils/        # Shared utilities
├── backtesting/  # Backtesting framework
└── main.ts       # Application entry point
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run clean` - Clean build directory

## Configuration

All configuration is managed through environment variables. Copy `.env.example` to `.env` and update the values:

- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token
- `TELEGRAM_CHAT_ID` - Default chat ID for notifications
- API keys for various market data providers
- Cache and performance settings

## Architecture

The project follows SOLID principles with:
- **Dependency Injection** using InversifyJS
- **Interface-based design** for all services
- **Modular architecture** with clear boundaries
- **Functional programming** for business logic
- **Comprehensive testing** with Jest

## Features

- 🤖 Telegram bot integration
- 📊 Multiple market data providers
- 🔍 Real-time signal processing
- 📈 Chart generation and visualization
- 🏥 Health monitoring
- 🧪 Comprehensive backtesting
- 📝 Structured logging
- ⚡ High performance with caching

## Development Guidelines

- Follow TypeScript strict mode
- Avoid `any` type usage
- Write tests for all business logic
- Use pure functions where possible
- Implement proper error handling
- Follow the established project structure

## Testing

Run the test suite:
```bash
npm test
```

For test coverage:
```bash
npm run test:coverage
```

Minimum coverage requirement: 80%

## License

MIT
