# High/Low Indicator Documentation

## Overview

The High/Low Indicator is a comprehensive technical analysis tool that calculates the highest and lowest price levels for specified time periods. This indicator supports various time frames including standard intervals, relative periods (like "previous day" or "previous week"), and custom time ranges.

## Features

### Supported Period Types

1. **Relative Periods**: 
   - `prev_day` - Previous complete day
   - `prev_week` - Previous complete week (Monday to Sunday)
   - `prev_month` - Previous complete month
   - `current_day` - Current day so far
   - `current_week` - Current week so far
   - `current_month` - Current month so far

2. **Standard Intervals**: 
   - `1m`, `3m`, `5m`, `15m`, `30m` - Minutes
   - `1h`, `2h`, `4h`, `6h`, `8h`, `12h` - Hours
   - `1d`, `3d` - Days
   - `1w` - Week
   - `1M` - Month

3. **Custom Periods**:
   ```typescript
   {
     type: 'custom',
     startTime: new Date('2023-01-01'),
     endTime: new Date('2023-01-07')
   }
   ```

4. **Rolling Periods**:
   ```typescript
   {
     type: 'rolling',
     periods: 24,
     interval: '1h'
   }
   ```

### Calculation Modes

- **Standard High/Low**: Uses the actual high and low prices from candlestick data
- **Body High/Low**: Uses the maximum and minimum of open/close prices (excludes wicks)

## API Reference

### IndicatorService Interface

```typescript
interface IndicatorService {
  calculateHighLow(config: HighLowIndicatorConfig): Promise<HighLowResult>;
  calculateMultipleHighLow(configs: HighLowIndicatorConfig[]): Promise<HighLowResult[]>;
  getHighLowForPreviousPeriod(symbol: string, period: 'day' | 'week' | 'month', interval?: string): Promise<HighLowResult>;
}
```

### Configuration

```typescript
interface HighLowIndicatorConfig {
  symbol: string;              // Trading pair symbol (e.g., 'BTC/USDT')
  period: PeriodSpec;          // Time period specification
  useBodyHighLow?: boolean;    // Use open/close instead of high/low
  timezone?: string;           // Timezone for day/week calculations
}
```

### Result

```typescript
interface HighLowResult {
  symbol: string;              // Trading pair symbol
  interval: string;            // Detected interval from data
  period: string;              // Period specification (JSON string)
  high: number;                // Highest price in the period
  low: number;                 // Lowest price in the period
  highTime: Date;              // Timestamp of the high
  lowTime: Date;               // Timestamp of the low
  range: number;               // Price range (high - low)
  rangePercent: number;        // Range as percentage of low price
  calculatedAt: Date;          // Calculation timestamp
}
```

## Usage Examples

### Basic Usage

```typescript
import { IndicatorService } from './core/indicators/indicator.service';
import { TYPES } from './config/types';

// Get service from DI container
const indicatorService = container.get<IndicatorService>(TYPES.IndicatorService);

// Calculate previous day high/low
const result = await indicatorService.getHighLowForPreviousPeriod('BTC/USDT', 'day');
console.log(`Previous day range: $${result.low} - $${result.high}`);
```

### Advanced Configuration

```typescript
const config: HighLowIndicatorConfig = {
  symbol: 'ETH/USDT',
  period: {
    type: 'rolling',
    periods: 168, // 7 days * 24 hours
    interval: '1h'
  },
  useBodyHighLow: false,
  timezone: 'UTC'
};

const result = await indicatorService.calculateHighLow(config);
```

### Multiple Symbols

```typescript
const configs = [
  { symbol: 'BTC/USDT', period: 'prev_day' },
  { symbol: 'ETH/USDT', period: 'prev_day' },
  { symbol: 'BNB/USDT', period: 'prev_day' }
];

const results = await indicatorService.calculateMultipleHighLow(configs);
results.forEach(result => {
  console.log(`${result.symbol}: ${result.rangePercent.toFixed(2)}% range`);
});
```

## Implementation Details

### Data Requirements

The indicator automatically determines the appropriate data interval and limit based on the period specification:

- **Daily periods**: Uses 1-hour intervals
- **Weekly periods**: Uses 4-hour intervals  
- **Monthly periods**: Uses daily intervals
- **Custom periods**: Calculates optimal interval based on time span

### Time Zone Handling

- Default timezone is UTC
- Day/week calculations respect timezone boundaries
- Week calculations use Monday as the first day of the week

### Performance Considerations

- Results are cached at the market data provider level
- Multiple indicators can be calculated in parallel
- Automatic data limit optimization to minimize API calls

### Error Handling

- Validates input data for completeness and consistency
- Throws descriptive errors for invalid configurations
- Logs performance metrics and calculation details

## Testing

The indicator includes comprehensive unit tests covering:

- All period types and configurations
- Edge cases and error conditions
- Data validation and filtering
- Performance monitoring

Run tests with:
```bash
npm test -- src/core/indicators/__tests__/
```

## Examples

See `src/examples/high-low-indicator.example.ts` for complete working examples demonstrating all features.

## Dependencies

- **Market Data Provider**: Fetches candlestick data from exchanges
- **Logger**: Records calculation metrics and errors
- **Time Utils**: Provides interval calculations and validation

## Integration

The High/Low Indicator integrates seamlessly with:

- **Telegram Bot**: For sending high/low alerts
- **Chart Service**: For visualizing support/resistance levels
- **Signal Processing**: As input for trading strategies
- **Backtesting Engine**: For historical analysis
