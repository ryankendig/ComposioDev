/**
 * Rate Limit Handler - Usage Examples
 * 
 * This file demonstrates various ways to use the rate limit handling utilities
 * in production scenarios.
 */

import {
  fetchWithRateLimit,
  createRateLimitedFetch,
  withRateLimitHandling,
} from './rateLimitHandler.js';

// ============================================================================
// Example 1: Basic usage with default configuration
// ============================================================================

async function basicExample() {
  try {
    const response = await fetchWithRateLimit('https://api.example.com/data');
    const data = await response.json();
    console.log('Success:', data);
    return data;
  } catch (error) {
    if (error.status === 429) {
      console.error('Rate limit exceeded after all retries:', error.message);
      // Handle gracefully - show user message, log to monitoring, etc.
    } else {
      console.error('Request failed:', error.message);
    }
    throw error;
  }
}

// ============================================================================
// Example 2: Custom configuration for aggressive APIs
// ============================================================================

async function aggressiveApiExample() {
  const config = {
    maxRetries: 3,
    baseDelay: 2000, // Start with 2 seconds
    maxDelay: 120000, // Max 2 minutes
    jitterFactor: 0.3, // 30% jitter for better distribution
  };

  try {
    const response = await fetchWithRateLimit(
      'https://api.strict-limits.com/endpoint',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer TOKEN',
        },
        body: JSON.stringify({ query: 'data' }),
      },
      config
    );
    return await response.json();
  } catch (error) {
    console.error('Failed after retries:', error);
    return null; // Safe fallback
  }
}

// ============================================================================
// Example 3: Create a reusable rate-limited fetch function
// ============================================================================

// Configure once, use everywhere
const rateLimitedFetch = createRateLimitedFetch({
  maxRetries: 4,
  baseDelay: 1500,
  maxDelay: 90000,
  jitterFactor: 0.25,
});

async function reusableExample() {
  try {
    // Use the configured function throughout your app
    const response = await rateLimitedFetch('https://api.example.com/users');
    return await response.json();
  } catch (error) {
    console.error('Request failed:', error);
    return [];
  }
}

// ============================================================================
// Example 4: React integration with hooks
// ============================================================================

import { useState, useEffect } from 'react';

function useApiData(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetchWithRateLimit(url);
        const result = await response.json();
        
        if (mounted) {
          setData(result);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
          console.error('API Error:', err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, [url]);

  return { data, loading, error };
}

// Usage in component:
function UserList() {
  const { data, loading, error } = useApiData('https://api.example.com/users');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <ul>
      {data?.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}

// ============================================================================
// Example 5: Wrapping existing API clients
// ============================================================================

class ApiClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.rateLimitedFetch = createRateLimitedFetch({
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 60000,
    });
  }

  async get(endpoint) {
    const response = await this.rateLimitedFetch(
      `${this.baseUrl}${endpoint}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    return await response.json();
  }

  async post(endpoint, data) {
    const response = await this.rateLimitedFetch(
      `${this.baseUrl}${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(data),
      }
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    return await response.json();
  }
}

// Usage:
const client = new ApiClient('https://api.example.com', 'your-api-key');

async function apiClientExample() {
  try {
    const users = await client.get('/users');
    const newUser = await client.post('/users', { name: 'John Doe' });
    return { users, newUser };
  } catch (error) {
    console.error('API operation failed:', error);
    return null;
  }
}

// ============================================================================
// Example 6: Using withRateLimitHandling for non-fetch APIs
// ============================================================================

// Wrap any async function that might throw 429 errors
async function apiCallThatMightRateLimit() {
  // Simulate an API call that might return 429
  const response = await fetch('https://api.example.com/data');
  
  if (response.status === 429) {
    const error = new Error('Rate limited');
    error.status = 429;
    error.response = response;
    throw error;
  }
  
  return await response.json();
}

async function wrappedApiExample() {
  try {
    const data = await withRateLimitHandling(
      apiCallThatMightRateLimit,
      {
        maxRetries: 3,
        baseDelay: 2000,
      }
    );
    console.log('Got data:', data);
    return data;
  } catch (error) {
    console.error('All retries exhausted:', error);
    return null;
  }
}

// ============================================================================
// Example 7: Batch operations with rate limiting
// ============================================================================

async function batchOperationsExample(userIds) {
  const results = [];
  const errors = [];

  // Process in batches to avoid overwhelming the API
  const batchSize = 5;
  
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    
    const batchResults = await Promise.allSettled(
      batch.map(async (userId) => {
        try {
          const response = await fetchWithRateLimit(
            `https://api.example.com/users/${userId}`
          );
          return await response.json();
        } catch (error) {
          console.error(`Failed to fetch user ${userId}:`, error.message);
          throw error;
        }
      })
    );

    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        errors.push({
          userId: batch[index],
          error: result.reason.message,
        });
      }
    });

    // Add a small delay between batches
    if (i + batchSize < userIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return { results, errors };
}

// ============================================================================
// Example 8: Integration with error reporting (e.g., Sentry)
// ============================================================================

import * as Sentry from '@sentry/react';

async function sentryIntegrationExample() {
  try {
    const response = await fetchWithRateLimit('https://api.example.com/data');
    return await response.json();
  } catch (error) {
    // Only report to Sentry if it's NOT a rate limit error
    // (rate limits are expected and shouldn't trigger alerts)
    if (error.status !== 429) {
      Sentry.captureException(error, {
        tags: {
          api_endpoint: 'data',
        },
      });
    } else {
      // Log rate limit as a breadcrumb for context
      Sentry.addBreadcrumb({
        category: 'api',
        message: 'Rate limit exceeded after retries',
        level: 'warning',
      });
    }
    
    throw error;
  }
}

// ============================================================================
// Example 9: Graceful degradation
// ============================================================================

async function gracefulDegradationExample() {
  try {
    // Try to fetch live data with rate limit handling
    const response = await fetchWithRateLimit(
      'https://api.example.com/live-data',
      {},
      { maxRetries: 2, baseDelay: 500 }
    );
    return await response.json();
  } catch (error) {
    if (error.status === 429) {
      console.warn('Rate limited, falling back to cached data');
      // Return cached or default data
      return getCachedData() || getDefaultData();
    }
    throw error;
  }
}

function getCachedData() {
  // Return cached data from localStorage, IndexedDB, etc.
  const cached = localStorage.getItem('api-cache');
  return cached ? JSON.parse(cached) : null;
}

function getDefaultData() {
  return { message: 'Default fallback data' };
}

// ============================================================================
// Export examples for testing
// ============================================================================

export {
  basicExample,
  aggressiveApiExample,
  reusableExample,
  useApiData,
  UserList,
  ApiClient,
  apiClientExample,
  wrappedApiExample,
  batchOperationsExample,
  sentryIntegrationExample,
  gracefulDegradationExample,
};
