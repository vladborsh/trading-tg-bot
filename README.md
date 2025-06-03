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
