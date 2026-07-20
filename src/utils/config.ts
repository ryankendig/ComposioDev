import dotenv from 'dotenv';
import { IntegrationConfig } from '../types/index.js';

// Load environment variables
dotenv.config();

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): IntegrationConfig {
  const amplitudeRegion = (process.env.AMPLITUDE_REGION || 'US').toUpperCase();
  
  if (amplitudeRegion !== 'US' && amplitudeRegion !== 'EU') {
    throw new Error('AMPLITUDE_REGION must be either US or EU');
  }

  const config: IntegrationConfig = {
    amplitude: {
      apiUrl: process.env.AMPLITUDE_API_URL || 
        (amplitudeRegion === 'EU' 
          ? 'https://mcp.eu.amplitude.com/mcp' 
          : 'https://mcp.amplitude.com/mcp'),
      region: amplitudeRegion as 'US' | 'EU',
    },
    clickup: {
      apiKey: process.env.CLICKUP_API_KEY || '',
      workspaceId: process.env.CLICKUP_WORKSPACE_ID || '',
      baseUrl: process.env.CLICKUP_API_URL || 'https://api.clickup.com/api/v2',
    },
    syncIntervalMinutes: parseInt(process.env.SYNC_INTERVAL_MINUTES || '60', 10),
    logLevel: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
  };

  // Validate required configuration
  if (!config.clickup.apiKey) {
    console.warn('Warning: CLICKUP_API_KEY is not set. ClickUp integration will not work.');
  }

  if (!config.clickup.workspaceId) {
    console.warn('Warning: CLICKUP_WORKSPACE_ID is not set. ClickUp integration may not work properly.');
  }

  return config;
}

/**
 * Simple logger utility
 */
export class Logger {
  private logLevel: 'debug' | 'info' | 'warn' | 'error';
  private levels = { debug: 0, info: 1, warn: 2, error: 3 };

  constructor(logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info') {
    this.logLevel = logLevel;
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    return this.levels[level] >= this.levels[this.logLevel];
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
}
