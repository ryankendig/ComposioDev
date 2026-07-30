# Rate Limit Handling

Production-oriented rate limit handling utilities for handling HTTP 429 responses with automatic retry logic.

## Features

✅ **Detects HTTP 429 responses** - Automatically identifies rate limit errors  
✅ **Honors Retry-After header** - Respects server-specified retry delays (both seconds and HTTP date formats)  
✅ **Bounded exponential backoff with jitter** - Implements industry-standard retry pattern  
✅ **Maximum retry count enforcement** - Prevents infinite retry loops  
✅ **Safe final failure handling** - Gracefully handles exhausted retries with detailed error information  

## Installation

No external dependencies required. The utilities are self-contained and work with the native `fetch` API.

## Quick Start

```javascript
import { fetchWithRateLimit } from './rateLimitHandler.js';

async function fetchData() {
  try {
    const response = await fetchWithRateLimit('https://api.example.com/data');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}
```

## API Reference

### `fetchWithRateLimit(url, options, config)`

Enhanced `fetch` with automatic rate limit handling.

**Parameters:**
- `url` (string): URL to fetch
- `options` (object, optional): Standard fetch options (method, headers, body, etc.)
- `config` (object, optional): Rate limit configuration
  - `maxRetries` (number): Maximum retry attempts (default: 5)
  - `baseDelay` (number): Base delay in milliseconds (default: 1000)
  - `maxDelay` (number): Maximum delay in milliseconds (default: 60000)
  - `jitterFactor` (number): Jitter factor 0-1 (default: 0.2)

**Returns:** Promise<Response>

**Throws:** Error when max retries exceeded or request fails

### `createRateLimitedFetch(config)`

Create a reusable rate-limited fetch function with preset configuration.

**Parameters:**
- `config` (object): Default configuration for all requests

**Returns:** Function that accepts (url, options) parameters

**Example:**
```javascript
const rateLimitedFetch = createRateLimitedFetch({
  maxRetries: 3,
  baseDelay: 2000,
});

const response = await rateLimitedFetch('https://api.example.com/data');
```

### `withRateLimitHandling(apiCall, config)`

Higher-order function to wrap any async API call with rate limit handling.

**Parameters:**
- `apiCall` (Function): Async function that may throw rate limit errors
- `config` (object, optional): Rate limit configuration

**Returns:** Promise with the result of apiCall

**Example:**
```javascript
const data = await withRateLimitHandling(
  async () => {
    // Your API call here
    return await someApiClient.getData();
  },
  { maxRetries: 3 }
);
```

## How It Works

### 1. Rate Limit Detection

The handler detects HTTP 429 (Too Many Requests) responses and automatically initiates retry logic.

### 2. Retry-After Header Support

When the server includes a `Retry-After` header, the handler:
- Parses it as seconds (integer) or HTTP date string
- Uses this value as the retry delay (capped by `maxDelay`)
- Falls back to exponential backoff if parsing fails

### 3. Exponential Backoff with Jitter

The delay calculation follows this formula:

```
delay = min(baseDelay * 2^attempt, maxDelay) + jitter
jitter = delay * jitterFactor * random(-1, 1)
```

This creates a retry sequence like:
- Attempt 1: ~1s (1000ms ± 20%)
- Attempt 2: ~2s (2000ms ± 20%)
- Attempt 3: ~4s (4000ms ± 20%)
- Attempt 4: ~8s (8000ms ± 20%)
- Attempt 5: ~16s (16000ms ± 20%)

**Why jitter?** It prevents the "thundering herd" problem where multiple clients retry simultaneously.

### 4. Maximum Retry Enforcement

After `maxRetries` attempts, the handler:
- Throws an enhanced error with retry information
- Includes the last response/error for debugging
- Logs all retry attempts for observability

### 5. Safe Final Failure

When retries are exhausted, the handler:
```javascript
const error = new Error('Rate limit exceeded after 5 retries');
error.response = lastResponse; // The 429 response
error.status = 429;
throw error;
```

## Configuration Guide

### Conservative API (default)
```javascript
{
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 60000,
  jitterFactor: 0.2,
}
```

### Aggressive/Strict API
```javascript
{
  maxRetries: 3,
  baseDelay: 2000,
  maxDelay: 120000,
  jitterFactor: 0.3,
}
```

### Fast/User-Facing Operation
```javascript
{
  maxRetries: 2,
  baseDelay: 500,
  maxDelay: 10000,
  jitterFactor: 0.15,
}
```

### Background/Batch Operation
```javascript
{
  maxRetries: 10,
  baseDelay: 2000,
  maxDelay: 300000, // 5 minutes
  jitterFactor: 0.25,
}
```

## Integration Patterns

### React Hook Pattern

```javascript
function useApiData(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        const response = await fetchWithRateLimit(url);
        const result = await response.json();
        if (mounted) setData(result);
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();
    return () => { mounted = false; };
  }, [url]);

  return { data, loading, error };
}
```

### API Client Wrapper

```javascript
class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.fetch = createRateLimitedFetch({ maxRetries: 5 });
  }

  async get(endpoint) {
    const response = await this.fetch(`${this.baseUrl}${endpoint}`);
    return await response.json();
  }
}
```

### Error Monitoring Integration

```javascript
import * as Sentry from '@sentry/react';

try {
  const response = await fetchWithRateLimit(url);
  return await response.json();
} catch (error) {
  // Don't alert on rate limits - they're expected
  if (error.status !== 429) {
    Sentry.captureException(error);
  }
  throw error;
}
```

## Best Practices

### 1. Choose Appropriate Configuration

Match your retry configuration to the API's characteristics:
- Stricter limits → fewer retries, longer delays
- User-facing → fewer retries, shorter delays
- Background jobs → more retries, longer max delay

### 2. Handle Final Failures Gracefully

```javascript
try {
  return await fetchWithRateLimit(url);
} catch (error) {
  if (error.status === 429) {
    // Show user-friendly message
    showNotification('Service is busy, please try again later');
    // Fall back to cached data if available
    return getCachedData();
  }
  throw error;
}
```

### 3. Monitor Rate Limit Events

```javascript
try {
  return await fetchWithRateLimit(url);
} catch (error) {
  if (error.status === 429) {
    analytics.track('rate_limit_exceeded', {
      endpoint: url,
      retries: maxRetries,
    });
  }
  throw error;
}
```

### 4. Batch Operations with Delays

```javascript
// Process items in batches
for (let i = 0; i < items.length; i += batchSize) {
  const batch = items.slice(i, i + batchSize);
  await Promise.all(batch.map(item => 
    fetchWithRateLimit(`/api/items/${item.id}`)
  ));
  
  // Add delay between batches
  if (i + batchSize < items.length) {
    await new Promise(r => setTimeout(r, 1000));
  }
}
```

### 5. Don't Retry Non-Idempotent Operations Blindly

For POST/PUT/DELETE operations, ensure they're idempotent or implement additional safeguards:

```javascript
// Add idempotency key for non-idempotent operations
const response = await fetchWithRateLimit(url, {
  method: 'POST',
  headers: {
    'Idempotency-Key': generateUniqueId(),
  },
  body: JSON.stringify(data),
});
```

## Testing

### Simulating Rate Limits

```javascript
// Mock server that returns 429 with Retry-After
const mockServer = setupServer(
  rest.get('/api/data', (req, res, ctx) => {
    return res.once(
      ctx.status(429),
      ctx.set('Retry-After', '2'),
    );
  }),
  rest.get('/api/data', (req, res, ctx) => {
    return res(ctx.json({ success: true }));
  }),
);
```

### Unit Testing

```javascript
test('retries on 429 and succeeds', async () => {
  const result = await fetchWithRateLimit('/api/data', {}, {
    maxRetries: 2,
    baseDelay: 100,
  });
  
  expect(result.ok).toBe(true);
});

test('throws after max retries', async () => {
  await expect(
    fetchWithRateLimit('/always-429', {}, { maxRetries: 1 })
  ).rejects.toThrow('Rate limit exceeded');
});
```

## Troubleshooting

### Too Many Retries

**Problem:** Requests take too long due to excessive retries  
**Solution:** Reduce `maxRetries` for user-facing operations

### Thundering Herd

**Problem:** Multiple clients overwhelm API after rate limit lifts  
**Solution:** Increase `jitterFactor` (0.3-0.4) for better distribution

### Retry-After Not Honored

**Problem:** Handler ignores server retry timing  
**Solution:** Verify `Retry-After` header format (integer seconds or HTTP date)

### Memory Leaks in React

**Problem:** State updates after component unmount  
**Solution:** Use cleanup flag in useEffect (see React Hook Pattern above)

## Performance Considerations

- **Memory:** Minimal overhead, only stores last error/response
- **Network:** Adds retry logic but respects server timing
- **CPU:** Negligible - simple math operations for backoff calculation

## Browser Compatibility

Works in all modern browsers supporting:
- `fetch` API (or use polyfill)
- `Promise`
- `async/await`

For older browsers, include polyfills for fetch and Promise.

## License

This code is provided as-is for use in your project.
