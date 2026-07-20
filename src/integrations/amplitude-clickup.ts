import { AmplitudeService } from '../services/amplitude.service.js';
import { ClickUpService } from '../services/clickup.service.js';
import { AmplitudeInsight, ClickUpTask, SyncResult, InsightToTaskMapping } from '../types/index.js';
import { Logger } from '../utils/config.js';

/**
 * Orchestrates the integration between Amplitude and ClickUp
 * Syncs insights from Amplitude to tasks in ClickUp
 */
export class AmplitudeClickUpIntegration {
  private amplitudeService: AmplitudeService;
  private clickUpService: ClickUpService;
  private logger: Logger;
  private mappings: Map<string, InsightToTaskMapping>;
  private defaultListId?: string;

  constructor(
    amplitudeService: AmplitudeService,
    clickUpService: ClickUpService,
    logger: Logger
  ) {
    this.amplitudeService = amplitudeService;
    this.clickUpService = clickUpService;
    this.logger = logger;
    this.mappings = new Map();
  }

  /**
   * Initialize the integration
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Amplitude-ClickUp integration...');

    // Test connections
    const amplitudeConnected = await this.amplitudeService.testConnection();
    const clickupConnected = await this.clickUpService.testConnection();

    if (!amplitudeConnected) {
      this.logger.warn('Amplitude connection not fully configured. OAuth required.');
    }

    if (!clickupConnected) {
      throw new Error('Failed to connect to ClickUp. Please check your API credentials.');
    }

    // Get default list for tasks (first list in first space)
    try {
      const spaces = await this.clickUpService.getSpaces();
      if (spaces.length > 0) {
        const lists = await this.clickUpService.getLists(spaces[0].id);
        if (lists.length > 0) {
          this.defaultListId = lists[0].id;
          this.logger.info(`Using default list: ${lists[0].name} (${this.defaultListId})`);
        }
      }
    } catch (error) {
      this.logger.warn('Could not determine default list:', error);
    }

    this.logger.info('Integration initialized successfully');
  }

  /**
   * Set the default ClickUp list ID for creating tasks
   */
  setDefaultList(listId: string): void {
    this.defaultListId = listId;
    this.logger.info(`Default list set to: ${listId}`);
  }

  /**
   * Convert an Amplitude insight to a ClickUp task
   */
  private insightToTask(insight: AmplitudeInsight): ClickUpTask {
    // Map priority
    const priorityMap: Record<string, number> = {
      critical: 1, // Urgent
      high: 2,     // High
      medium: 3,   // Normal
      low: 4,      // Low
    };

    // Build task description with context
    const description = `
**Amplitude Insight**

${insight.description}

**Type:** ${insight.type}
**Priority:** ${insight.priority}
**Source ID:** ${insight.sourceId}
**Detected:** ${insight.timestamp.toISOString()}

**Data:**
\`\`\`json
${JSON.stringify(insight.data, null, 2)}
\`\`\`

---
*This task was automatically created by the Amplitude-ClickUp integration.*
    `.trim();

    return {
      name: insight.title,
      description,
      priority: priorityMap[insight.priority],
      tags: ['amplitude-insight', `insight-${insight.type}`],
      status: 'to do',
    };
  }

  /**
   * Sync insights from Amplitude to ClickUp
   */
  async syncInsights(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      insightsProcessed: 0,
      tasksCreated: 0,
      tasksUpdated: 0,
      errors: [],
      timestamp: new Date(),
    };

    try {
      this.logger.info('Starting insight sync...');

      if (!this.defaultListId) {
        throw new Error('No default list configured. Call setDefaultList() first or ensure workspace has lists.');
      }

      // Get insights from Amplitude
      const insights = await this.amplitudeService.generateInsights();
      result.insightsProcessed = insights.length;

      this.logger.info(`Processing ${insights.length} insights`);

      for (const insight of insights) {
        try {
          // Check if we've already created a task for this insight
          const existingMapping = this.mappings.get(insight.sourceId);

          if (existingMapping) {
            // Update existing task
            const task = this.insightToTask(insight);
            await this.clickUpService.updateTask(existingMapping.taskId, {
              description: task.description,
              priority: task.priority,
            });
            
            existingMapping.lastSynced = new Date();
            result.tasksUpdated++;
            this.logger.info(`Updated task for insight: ${insight.sourceId}`);
          } else {
            // Create new task
            const task = this.insightToTask(insight);
            const createdTask = await this.clickUpService.createTask(this.defaultListId, task);

            if (createdTask.id) {
              // Store mapping
              this.mappings.set(insight.sourceId, {
                insightId: insight.sourceId,
                taskId: createdTask.id,
                createdAt: new Date(),
                lastSynced: new Date(),
              });

              result.tasksCreated++;
              this.logger.info(`Created task for insight: ${insight.sourceId}`);
            }
          }
        } catch (error) {
          const errorMsg = `Failed to process insight ${insight.sourceId}: ${error}`;
          this.logger.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      result.success = result.errors.length === 0;
      this.logger.info(`Sync completed: ${result.tasksCreated} created, ${result.tasksUpdated} updated, ${result.errors.length} errors`);

      return result;
    } catch (error) {
      const errorMsg = `Sync failed: ${error}`;
      this.logger.error(errorMsg);
      result.errors.push(errorMsg);
      return result;
    }
  }

  /**
   * Create a task in ClickUp from an Amplitude chart or experiment
   */
  async createTaskFromAmplitudeData(
    dataType: 'chart' | 'experiment' | 'dashboard',
    dataId: string,
    listId?: string
  ): Promise<ClickUpTask> {
    const targetListId = listId || this.defaultListId;
    
    if (!targetListId) {
      throw new Error('No list ID provided and no default list configured');
    }

    let task: ClickUpTask;

    switch (dataType) {
      case 'chart':
        const chart = await this.amplitudeService.queryChart(dataId);
        task = {
          name: `Review Chart: ${chart.name}`,
          description: `
**Amplitude Chart Review**

**Chart ID:** ${chart.id}
**Type:** ${chart.type}
**Description:** ${chart.description || 'N/A'}

Please review this chart and take appropriate action based on the data.

---
*Created by Amplitude-ClickUp integration*
          `.trim(),
          tags: ['amplitude', 'chart-review'],
          status: 'to do',
        };
        break;

      case 'experiment':
        const experiment = await this.amplitudeService.queryExperiment(dataId);
        task = {
          name: `Experiment Review: ${experiment.name}`,
          description: `
**Amplitude Experiment**

**Experiment ID:** ${experiment.id}
**Status:** ${experiment.status}
**Hypothesis:** ${experiment.hypothesis || 'N/A'}

**Results:**
\`\`\`json
${JSON.stringify(experiment.results, null, 2)}
\`\`\`

---
*Created by Amplitude-ClickUp integration*
          `.trim(),
          tags: ['amplitude', 'experiment', experiment.status],
          status: 'to do',
          priority: 2, // High priority for experiments
        };
        break;

      case 'dashboard':
        const dashboard = await this.amplitudeService.getDashboard(dataId);
        task = {
          name: `Dashboard Review: ${dashboard.name}`,
          description: `
**Amplitude Dashboard**

**Dashboard ID:** ${dashboard.id}
**Description:** ${dashboard.description || 'N/A'}
**Charts:** ${dashboard.charts.length}

Review this dashboard and associated metrics.

---
*Created by Amplitude-ClickUp integration*
          `.trim(),
          tags: ['amplitude', 'dashboard-review'],
          status: 'to do',
        };
        break;

      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }

    return await this.clickUpService.createTask(targetListId, task);
  }

  /**
   * Get sync statistics
   */
  getSyncStats() {
    return {
      totalMappings: this.mappings.size,
      mappings: Array.from(this.mappings.values()),
    };
  }
}
