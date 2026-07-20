/**
 * Configuration Types for Amplitude-ClickUp MCP Integration
 */

export interface AmplitudeConfig {
  apiUrl: string;
  region: 'US' | 'EU';
  authenticated?: boolean;
}

export interface ClickUpConfig {
  apiKey: string;
  workspaceId: string;
  baseUrl?: string;
}

export interface IntegrationConfig {
  amplitude: AmplitudeConfig;
  clickup: ClickUpConfig;
  syncIntervalMinutes: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Amplitude Data Types
 */

export interface AmplitudeChart {
  id: string;
  name: string;
  type: string;
  description?: string;
  data?: any;
}

export interface AmplitudeDashboard {
  id: string;
  name: string;
  description?: string;
  charts: AmplitudeChart[];
}

export interface AmplitudeExperiment {
  id: string;
  name: string;
  status: string;
  hypothesis?: string;
  results?: any;
}

export interface AmplitudeMetric {
  id: string;
  name: string;
  value: number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
}

export interface AmplitudeInsight {
  type: 'metric' | 'experiment' | 'anomaly' | 'trend';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  data: any;
  sourceId: string;
  timestamp: Date;
}

/**
 * ClickUp Data Types
 */

export interface ClickUpTask {
  id?: string;
  name: string;
  description?: string;
  status?: string;
  priority?: number;
  assignees?: string[];
  tags?: string[];
  customFields?: Record<string, any>;
  dueDate?: number;
}

export interface ClickUpList {
  id: string;
  name: string;
  space: string;
}

export interface ClickUpSpace {
  id: string;
  name: string;
}

/**
 * Integration Types
 */

export interface SyncResult {
  success: boolean;
  insightsProcessed: number;
  tasksCreated: number;
  tasksUpdated: number;
  errors: string[];
  timestamp: Date;
}

export interface InsightToTaskMapping {
  insightId: string;
  taskId: string;
  createdAt: Date;
  lastSynced: Date;
}
