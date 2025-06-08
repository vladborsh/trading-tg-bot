# Correlation Crack Strategy

## Overview

The Correlation Crack Strategy identifies trading opportunities by detecting when one asset from a group of highly correlated assets breaks a key level (support or resistance) while the other correlated assets remain within their ranges. This divergence often signals the beginning of a strong directional move in the breakout asset.

## Key Concepts

### High London Session (HLS)
- The highest price reached during the London trading session (3 AM - 8 AM NY time)
- Used as resistance level for cross-under signals

### Low London Session (LLS)  
- The lowest price reached during the London trading session (3 AM - 8 AM NY time)
- Used as support level for cross-over signals

### Correlation Crack Pattern
- **Cross-Under**: Price was above HLS and then crossed below it
- **Cross-Over**: Price was below LLS and then crossed above it
- **Signal Condition**: Only ONE asset from the correlated group shows the cross condition

## Strategy Configuration

### Basic Configuration

```typescript
import { CorrelationCrackConfig, CrossDirection } from '../core/strategies/strategy.interfaces';
import { SessionSpec } from '../core/indicators/indicator.interfaces';

const config: CorrelationCrackConfig = {
  primaryAssets: ['EURUSD', 'EURGBP', 'EURJPY'], // 2-4 correlated assets
  period: londonSession, // Time period for reference level calculation
  direction: CrossDirection.CROSS_UNDER, // or CROSS_OVER
  useBodyHighLow: false, // Use actual high/low vs open/close
  timezone: 'America/New_York',
  minCorrelatedAssets: 1 // Minimum assets that should NOT cross
};
```

### Period Types

#### 1. Session-Based Periods
```typescript
const londonSession: SessionSpec = {
  type: 'time_session',
  startHour: 3,    // 3 AM NY time
  endHour: 8,      // 8 AM NY time  
  startMinute: 0,  // Optional, default 0
  endMinute: 0,    // Optional, default 0
  timezone: 'America/New_York'
};
```

#### 2. Standard Periods
- `'prev_day'` - Previous complete trading day
- `'prev_week'` - Previous complete week (Monday-Sunday)
- `'prev_month'` - Previous complete month
- `'current_day'` - Current trading day
- `'current_week'` - Current week
- `'current_month'` - Current month

#### 3. Custom Periods
```typescript
const customPeriod = {
  type: 'custom',
  startTime: new Date('2025-01-01T08:00:00Z'),
  endTime: new Date('2025-01-01T16:00:00Z')
};
```

## Trading Examples

### Example 1: London Session High Break (Cross-Under)

**Setup:**
- Assets: EURUSD, EURGBP, EURJPY
- Period: London Session (3 AM - 8 AM NY)
- Direction: Cross-Under (break below HLS)

**Signal Conditions:**
1. Calculate HLS for each EUR pair during London session
2. Monitor for price action after London session close
3. Signal triggers when:
   - ONE EUR pair crosses below its HLS
   - Other EUR pairs remain above their HLS

**Trading Implications:**
- The breaking pair shows weakness
- Other pairs holding suggests selective selling pressure
- Potential short opportunity in the breaking pair

### Example 2: London Session Low Break (Cross-Over)

**Setup:**
- Assets: GBPUSD, GBPJPY, EURGBP  
- Period: London Session (3 AM - 8 AM NY)
- Direction: Cross-Over (break above LLS)

**Signal Conditions:**
1. Calculate LLS for each GBP pair during London session
2. Signal triggers when:
   - ONE GBP pair crosses above its LLS
   - Other GBP pairs remain below their LLS

**Trading Implications:**
- The breaking pair shows strength
- Selective buying pressure
- Potential long opportunity in the breaking pair

## Implementation Usage

### Basic Usage

```typescript
import { CorrelationCrackStrategy } from '../core/strategies/correlation-crack.strategy';
import { CrossDirection } from '../core/strategies/strategy.interfaces';

// Initialize strategy (with DI container)
const strategy = container.get<CorrelationCrackStrategy>(TYPES.CorrelationCrackStrategy);

// Configure for London session high break
const config = {
  primaryAssets: ['EURUSD', 'EURGBP', 'EURJPY'],
  period: {
    type: 'time_session',
    startHour: 3,
    endHour: 8,
    timezone: 'America/New_York'
  },
  direction: CrossDirection.CROSS_UNDER
};

// Execute strategy
const result = await strategy.execute(config);

if (result.success && result.signal) {
  console.log(`Signal: ${result.signal.triggerAsset} broke ${result.signal.direction}`);
  console.log(`Confidence: ${result.signal.confidence * 100}%`);
}
```

### Advanced Configuration

```typescript
const advancedConfig: CorrelationCrackConfig = {
  primaryAssets: ['AUDUSD', 'NZDUSD', 'USDCAD'],
  period: 'prev_day', // Previous day high/low
  direction: CrossDirection.CROSS_OVER,
  useBodyHighLow: true, // Use open/close instead of high/low
  timezone: 'America/New_York',
  minCorrelatedAssets: 2 // Require 2+ assets to NOT cross
};
```

## Signal Analysis

### Signal Structure

```typescript
interface StrategySignal {
  type: 'correlation_crack';
  direction: CrossDirection;
  triggerAsset: string;         // Asset that broke the level
  correlatedAssets: string[];   // Assets that held the level  
  referenceLevel: number;       // HLS or LLS value
  referencePeriod: string;      // Period used for calculation
  confidence: number;           // 0-1 confidence score
  timestamp: Date;
  conditions: AssetCondition[]; // Detailed condition for each asset
}
```

### Confidence Scoring

The strategy calculates confidence based on:

1. **Correlation Count**: More assets holding the level = higher confidence
2. **Price Distance**: Greater separation from reference level = higher confidence  
3. **Base Confidence**: Starts at 50%

```typescript
// Confidence calculation factors:
confidence = 0.5 + (notCrossedCount - 1) * 0.1 + avgDistance * 2
```

## Best Practices

### 1. Asset Selection
- Use highly correlated assets (correlation > 0.7)
- Limit to 2-4 assets to avoid false signals
- Consider major pairs for forex (EUR, GBP, JPY crosses)

### 2. Time Sessions
- London session (3-8 AM NY) ideal for EUR/GBP pairs
- US session (9:30-11:30 AM NY) for USD pairs
- Asian session (7 PM - 2 AM NY) for JPY pairs

### 3. Risk Management
- Set stop loss beyond the reference level (HLS/LLS)
- Use proper position sizing based on confidence score
- Monitor correlation breakdown as signal invalidation

### 4. Signal Confirmation
- Combine with volume analysis
- Check multiple timeframes
- Consider market context (news, economic events)

## Common Scenarios

### Scenario 1: Perfect Correlation Crack
- EURUSD breaks below London high
- EURGBP and EURJPY hold above their London highs
- **Action**: Short EURUSD with tight stop above London high

### Scenario 2: Multiple Breaks (No Signal)
- Both EURUSD and EURGBP break below London highs
- **Action**: No signal - suggests broader EUR weakness

### Scenario 3: No Breaks
- All EUR pairs remain above London highs
- **Action**: No signal - ranges still intact

## Limitations

1. **Market Conditions**: Works best in trending/volatile markets
2. **Correlation Changes**: Asset correlations can break down during news events
3. **Timeframe Dependency**: Signal quality varies by timeframe
4. **False Signals**: Whipsaws can occur around key levels

## Integration with Other Strategies

The Correlation Crack Strategy works well with:

- **Volume Profile**: Confirm breakouts with volume
- **Support/Resistance**: Additional confluence levels
- **Moving Averages**: Trend direction confirmation
- **RSI/MACD**: Momentum confirmation

## Performance Monitoring

Track the following metrics:
- Win rate by asset group
- Average profit/loss per signal
- Signal frequency by time session
- Correlation stability over time
- Confidence score effectiveness

## Troubleshooting

### Common Issues

1. **No Signals Generated**
   - Check asset correlation levels
   - Verify time session configuration
   - Ensure sufficient market volatility

2. **Too Many False Signals**
   - Increase `minCorrelatedAssets` parameter
   - Add volume or momentum filters
   - Adjust confidence threshold

3. **Strategy Execution Errors**
   - Verify market data provider connectivity
   - Check API rate limits
   - Ensure sufficient historical data

### Debugging Tips

```typescript
// Enable debug logging
const logger = container.get<Logger>(TYPES.Logger);
logger.level = 'debug';

// Check individual asset conditions
result.signal?.conditions.forEach(condition => {
  console.log(`${condition.symbol}: ${condition.hasCrossed ? 'CROSSED' : 'HELD'}`);
});
```
