/**
 * Rate Limit Handler Demo
 * 
 * Run this file to see the rate limit handler in action.
 * This demonstrates the retry behavior with simulated 429 responses.
 */

import { fetchWithRateLimit } from './rateLimitHandler.js';

// Demo configuration
const DEMO_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  jitterFactor: 0.2,
};

/**
 * Simulate an API endpoint that rate limits on first few attempts
 */
class MockApiServer {
  constructor(failCount = 2) {
    this.attemptCount = 0;
    this.failCount = failCount;
  }

  async fetch(url, options) {
    this.attemptCount++;
    console.log(`[MockAPI] Attempt ${this.attemptCount}`);

    // Simulate rate limiting for first N attempts
    if (this.attemptCount <= this.failCount) {
      console.log(`[MockAPI] Returning 429 (Rate Limited)`);
      
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            // Simulate Retry-After header (2 seconds)
            'Retry-After': '2',
          },
        }
      );
    }

    // Success after retries
    console.log(`[MockAPI] Returning 200 (Success)`);
    return new Response(
      JSON.stringify({ 
        message: 'Success!', 
        data: { userId: 123, name: 'John Doe' },
        attempts: this.attemptCount,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  reset() {
    this.attemptCount = 0;
  }
}

/**
 * Demo 1: Successful retry after rate limiting
 */
async function demoSuccessfulRetry() {
  console.log('\n=== Demo 1: Successful Retry ===\n');
  
  const mockServer = new MockApiServer(2); // Fail twice, then succeed
  
  // Override global fetch for demo
  const originalFetch = global.fetch;
  global.fetch = mockServer.fetch.bind(mockServer);

  try {
    const startTime = Date.now();
    const response = await fetchWithRateLimit(
      'https://api.example.com/data',
      {},
      DEMO_CONFIG
    );
    
    const data = await response.json();
    const duration = Date.now() - startTime;
    
    console.log('\n✅ Success!');
    console.log('Response:', data);
    console.log(`Total duration: ${duration}ms`);
    console.log(`Total attempts: ${data.attempts}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    global.fetch = originalFetch;
  }
}

/**
 * Demo 2: Exhausted retries (all attempts fail)
 */
async function demoExhaustedRetries() {
  console.log('\n=== Demo 2: Exhausted Retries ===\n');
  
  const mockServer = new MockApiServer(10); // Always fail
  
  const originalFetch = global.fetch;
  global.fetch = mockServer.fetch.bind(mockServer);

  try {
    const startTime = Date.now();
    await fetchWithRateLimit(
      'https://api.example.com/data',
      {},
      DEMO_CONFIG
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.log('\n❌ All retries exhausted');
    console.log('Error:', error.message);
    console.log('Status:', error.status);
    console.log(`Total duration: ${duration}ms`);
    console.log(`Total attempts: ${mockServer.attemptCount}`);
  } finally {
    global.fetch = originalFetch;
  }
}

/**
 * Demo 3: Immediate success (no rate limiting)
 */
async function demoImmediateSuccess() {
  console.log('\n=== Demo 3: Immediate Success ===\n');
  
  const mockServer = new MockApiServer(0); // Never fail
  
  const originalFetch = global.fetch;
  global.fetch = mockServer.fetch.bind(mockServer);

  try {
    const startTime = Date.now();
    const response = await fetchWithRateLimit(
      'https://api.example.com/data',
      {},
      DEMO_CONFIG
    );
    
    const data = await response.json();
    const duration = Date.now() - startTime;
    
    console.log('\n✅ Immediate success (no retries needed)');
    console.log('Response:', data);
    console.log(`Total duration: ${duration}ms`);
    console.log(`Total attempts: ${data.attempts}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    global.fetch = originalFetch;
  }
}

/**
 * Demo 4: Backoff timing visualization
 */
function demoBackoffCalculation() {
  console.log('\n=== Demo 4: Backoff Timing ===\n');
  console.log('Configuration:', DEMO_CONFIG);
  console.log('\nExpected retry delays:\n');

  for (let attempt = 0; attempt < DEMO_CONFIG.maxRetries; attempt++) {
    const baseDelay = DEMO_CONFIG.baseDelay;
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const cappedDelay = Math.min(exponentialDelay, DEMO_CONFIG.maxDelay);
    const jitterRange = cappedDelay * DEMO_CONFIG.jitterFactor;
    
    const minDelay = Math.max(0, cappedDelay - jitterRange);
    const maxDelay = cappedDelay + jitterRange;
    
    console.log(
      `Attempt ${attempt + 1}: ${minDelay.toFixed(0)}-${maxDelay.toFixed(0)}ms ` +
      `(~${cappedDelay.toFixed(0)}ms ± ${(DEMO_CONFIG.jitterFactor * 100)}%)`
    );
  }
}

/**
 * Run all demos
 */
async function runAllDemos() {
  console.log('🚀 Rate Limit Handler Demo');
  console.log('================================\n');
  
  demoBackoffCalculation();
  await demoImmediateSuccess();
  await demoSuccessfulRetry();
  await demoExhaustedRetries();
  
  console.log('\n================================');
  console.log('✨ Demo completed!\n');
}

// Run demos if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllDemos().catch(console.error);
}

export {
  demoSuccessfulRetry,
  demoExhaustedRetries,
  demoImmediateSuccess,
  demoBackoffCalculation,
  runAllDemos,
};
