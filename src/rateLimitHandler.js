/**
 * Rate Limit Handler
 * 
 * Production-oriented utility for handling HTTP 429 rate limit responses with:
 * - Retry-After header support
 * - Bounded exponential backoff with jitter
 * - Maximum retry count enforcement
 * - Safe final failure handling
 */

const DEFAULT_CONFIG = {
  maxRetries: 5,
  baseDelay: 1000, // 1 second
  maxDelay: 60000, // 60 seconds
  jitterFactor: 0.2, // 20% jitter
};

/**
 * Calculate delay with exponential backoff and jitter
 * @param {number} attempt - Current retry attempt (0-indexed)
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {number} maxDelay - Maximum delay in milliseconds
 * @param {number} jitterFactor - Jitter factor (0-1)
 * @returns {number} Delay in milliseconds
 */
function calculateBackoffDelay(attempt, baseDelay, maxDelay, jitterFactor) {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, maxDelay);
  const jitter = cappedDelay * jitterFactor * (Math.random() * 2 - 1);
  return Math.max(0, Math.floor(cappedDelay + jitter));
}

/**
 * Parse Retry-After header value
 * @param {string} retryAfter - Retry-After header value (seconds or HTTP date)
 * @returns {number|null} Delay in milliseconds, or null if invalid
 */
function parseRetryAfter(retryAfter) {
  if (!retryAfter) return null;

  // Try parsing as seconds (integer)
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds) && seconds > 0) {
    return seconds * 1000;
  }

  // Try parsing as HTTP date
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    const delay = date.getTime() - Date.now();
    return delay > 0 ? delay : null;
  }

  return null;
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with automatic rate limit handling
 * @param {string} url - URL to fetch
 * @param {RequestInit} options - Fetch options
 * @param {object} config - Rate limit handler configuration
 * @param {number} config.maxRetries - Maximum number of retries
 * @param {number} config.baseDelay - Base delay for exponential backoff (ms)
 * @param {number} config.maxDelay - Maximum delay between retries (ms)
 * @param {number} config.jitterFactor - Jitter factor (0-1)
 * @returns {Promise<Response>}
 * @throws {Error} When max retries are exceeded or other errors occur
 */
export async function fetchWithRateLimit(url, options = {}, config = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError = null;
  let lastResponse = null;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // If not rate limited, return the response
      if (response.status !== 429) {
        return response;
      }

      // Store the rate-limited response
      lastResponse = response;

      // If we've exhausted retries, break
      if (attempt === finalConfig.maxRetries) {
        break;
      }

      // Calculate delay
      let delay;
      const retryAfter = response.headers.get('Retry-After');
      
      if (retryAfter) {
        const parsedDelay = parseRetryAfter(retryAfter);
        if (parsedDelay !== null) {
          delay = Math.min(parsedDelay, finalConfig.maxDelay);
        } else {
          delay = calculateBackoffDelay(
            attempt,
            finalConfig.baseDelay,
            finalConfig.maxDelay,
            finalConfig.jitterFactor
          );
        }
      } else {
        delay = calculateBackoffDelay(
          attempt,
          finalConfig.baseDelay,
          finalConfig.maxDelay,
          finalConfig.jitterFactor
        );
      }

      console.warn(
        `Rate limited (429). Retrying in ${delay}ms (attempt ${attempt + 1}/${finalConfig.maxRetries})...`
      );

      await sleep(delay);

    } catch (error) {
      lastError = error;
      // For network errors, we might want to retry too
      if (attempt === finalConfig.maxRetries) {
        break;
      }

      const delay = calculateBackoffDelay(
        attempt,
        finalConfig.baseDelay,
        finalConfig.maxDelay,
        finalConfig.jitterFactor
      );

      console.warn(
        `Request failed: ${error.message}. Retrying in ${delay}ms (attempt ${attempt + 1}/${finalConfig.maxRetries})...`
      );

      await sleep(delay);
    }
  }

  // Final failure handling
  if (lastResponse && lastResponse.status === 429) {
    const error = new Error(
      `Rate limit exceeded after ${finalConfig.maxRetries} retries`
    );
    error.response = lastResponse;
    error.status = 429;
    throw error;
  }

  if (lastError) {
    throw lastError;
  }

  // Should never reach here, but handle gracefully
  throw new Error('Request failed with unknown error');
}

/**
 * Create a rate-limited fetch function with custom configuration
 * @param {object} config - Default configuration for all requests
 * @returns {Function} Configured fetch function
 */
export function createRateLimitedFetch(config = {}) {
  return (url, options = {}) => fetchWithRateLimit(url, options, config);
}

/**
 * Higher-order function to wrap any async API call with rate limit handling
 * @param {Function} apiCall - Async function that may throw rate limit errors
 * @param {object} config - Rate limit handler configuration
 * @returns {Function} Wrapped function with rate limit handling
 */
export async function withRateLimitHandling(apiCall, config = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError = null;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      const result = await apiCall();
      return result;
    } catch (error) {
      lastError = error;

      // Check if it's a rate limit error
      const isRateLimit = 
        error.status === 429 || 
        error.response?.status === 429 ||
        error.statusCode === 429;

      if (!isRateLimit || attempt === finalConfig.maxRetries) {
        break;
      }

      // Calculate delay
      let delay;
      const retryAfter = 
        error.response?.headers?.get?.('Retry-After') ||
        error.headers?.['retry-after'];

      if (retryAfter) {
        const parsedDelay = parseRetryAfter(retryAfter);
        if (parsedDelay !== null) {
          delay = Math.min(parsedDelay, finalConfig.maxDelay);
        } else {
          delay = calculateBackoffDelay(
            attempt,
            finalConfig.baseDelay,
            finalConfig.maxDelay,
            finalConfig.jitterFactor
          );
        }
      } else {
        delay = calculateBackoffDelay(
          attempt,
          finalConfig.baseDelay,
          finalConfig.maxDelay,
          finalConfig.jitterFactor
        );
      }

      console.warn(
        `Rate limited. Retrying in ${delay}ms (attempt ${attempt + 1}/${finalConfig.maxRetries})...`
      );

      await sleep(delay);
    }
  }

  // Final failure - enhance error with retry information
  if (lastError) {
    lastError.message = `${lastError.message} (failed after ${finalConfig.maxRetries} retries)`;
    throw lastError;
  }

  throw new Error('Request failed with unknown error');
}
