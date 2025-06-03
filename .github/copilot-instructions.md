# Trading Bot Development Guidelines

## Architecture & Design Principles
- Avoid typescript `any` type
- Use TypeScript with strict type checking
- Cover new classes with unit Jest tests
- Follow functional programming principles
- Use pure functions for business logic
- Implement a modular architecture with clear boundaries
- Use interfaces to define contracts for services
- Use InversifyJS for dependency injection
- Implement SOLID principles with emphasis on:
  - Single Responsibility Principle
  - Dependency Inversion using interfaces and Inversify DI
- Maintain clear separation between:
  - Data access layer (market data fetching)
  - Business logic (signal processing, analysis)
  - Presentation layer (notifications, reporting)
  - Command handling

## Project Structure

```
src/
├── bot/          # Telegram bot interface
├── config/       # Environment configuration, constants
├── core/         # Trading logic, indicators
├── data/         # Market data integrations
├── domain/       # Core entities, interfaces
├── services/     # Supporting services (charts, reports)
├── utils/        # Shared utilities
├── backtesting/  # Backtesting framework
└── main.ts       # Application entry point
```

## Development Standards

1. Configuration Management
   - Store all configuration in typed constants
   - Externalize API endpoints, intervals, and thresholds
   - Use environment variables for sensitive data

2. Dependency Management
   - Use Inversify for dependency injection
   - Define interfaces for all services
   - Inject dependencies via constructor injection

3. Domain Model
   - Define strong types for all domain entities
   - Keep business logic pure and framework-agnostic
   - Use enums for fixed value sets

4. Testing Requirements
   - Write unit tests for all business logic
   - Mock external dependencies
   - Test edge cases and error conditions
   - Maintain test coverage above 80%

## Implementation Guidelines

1. Data Access
   - Abstract market data providers
   - Handle rate limiting and retries
   - Cache responses appropriately

2. Signal Processing
   - Implement strategy pattern for indicators
   - Use pure functions for calculations
   - Validate all inputs and outputs

3. Notification Handling
   - Support multiple notification channels
   - Format messages consistently
   - Handle transport errors gracefully

4. Backtesting
   - Support historical data replay
   - Generate performance metrics
   - Provide visual analysis tools

## Documentation Requirements

- Document all public APIs
- Include usage examples
- Maintain changelog
- Add setup instructions

## Performance Considerations

- Optimize data structures for frequent operations
- Implement caching where appropriate
- Handle memory management for historical data
- Monitor execution time of critical paths