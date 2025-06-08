# Trading Bot Development Guidelines

## Architecture & Design Principles
- Avoid typescript `any` type
- Use TypeScript with strict type checking
- Cover new classes with unit Jest tests
- Follow functional programming principles
- Use pure functions for business logic
- Implement a modular architecture with clear boundaries
- Use InversifyJS for dependency injection
- Implement SOLID principles with emphasis on:
  - Single Responsibility Principle
  - Dependency Inversion using interfaces and Inversify DI
- Method length should not exceed 20 lines
- Class length should not exceed 200 lines
   - If a class exceeds 200 lines, consider refactoring into smaller set of classes
- Maintain clear separation between:
  - Data access layer (market data fetching)
  - Business logic (signal processing, analysis)
  - Presentation layer (notifications, reporting)
  - Command handling


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
   - Maintain test coverage above 50%

## Implementation Guidelines

1. Data Access
   - Abstract market data providers

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