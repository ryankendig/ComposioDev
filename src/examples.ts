#!/usr/bin/env node

/**
 * Example usage of the Amplitude-ClickUp integration
 * This demonstrates how to use the integration programmatically
 */

import { AmplitudeService } from './services/amplitude.service.js';
import { ClickUpService } from './services/clickup.service.js';
import { AmplitudeClickUpIntegration } from './integrations/amplitude-clickup.js';
import { loadConfig, Logger } from './utils/config.js';

async function exampleUsage() {
  console.log('📚 Amplitude-ClickUp Integration Examples\n');

  // Load configuration
  const config = loadConfig();
  const logger = new Logger('info');

  // Initialize services
  const amplitudeService = new AmplitudeService(config.amplitude, logger);
  const clickUpService = new ClickUpService(config.clickup, logger);
  const integration = new AmplitudeClickUpIntegration(
    amplitudeService,
    clickUpService,
    logger
  );

  try {
    // Example 1: Initialize and test connections
    console.log('Example 1: Testing Connections');
    console.log('================================\n');
    await integration.initialize();
    console.log('✅ Connections established\n');

    // Example 2: Sync insights to tasks
    console.log('Example 2: Syncing Insights');
    console.log('============================\n');
    const syncResult = await integration.syncInsights();
    console.log(`Created: ${syncResult.tasksCreated} tasks`);
    console.log(`Updated: ${syncResult.tasksUpdated} tasks`);
    console.log(`Errors: ${syncResult.errors.length}\n`);

    // Example 3: Create task from specific Amplitude data
    console.log('Example 3: Creating Task from Amplitude Chart');
    console.log('==============================================\n');
    
    // Get spaces and lists
    const spaces = await clickUpService.getSpaces();
    if (spaces.length > 0) {
      const lists = await clickUpService.getLists(spaces[0].id);
      if (lists.length > 0) {
        const task = await integration.createTaskFromAmplitudeData(
          'chart',
          'example-chart-123',
          lists[0].id
        );
        console.log(`✅ Created task: ${task.name} (${task.id})\n`);
      }
    }

    // Example 4: Get sync statistics
    console.log('Example 4: Sync Statistics');
    console.log('==========================\n');
    const stats = integration.getSyncStats();
    console.log(`Total mappings: ${stats.totalMappings}`);
    console.log(`Latest mappings:`);
    stats.mappings.slice(0, 3).forEach(mapping => {
      console.log(`  - Insight ${mapping.insightId} → Task ${mapping.taskId}`);
    });
    console.log();

    // Example 5: Query Amplitude directly
    console.log('Example 5: Querying Amplitude Data');
    console.log('===================================\n');
    const dashboard = await amplitudeService.getDashboard('dashboard-123');
    console.log(`Dashboard: ${dashboard.name}`);
    console.log(`Charts: ${dashboard.charts.length}`);
    console.log();

    // Example 6: Create custom task
    console.log('Example 6: Creating Custom ClickUp Task');
    console.log('========================================\n');
    if (spaces.length > 0) {
      const lists = await clickUpService.getLists(spaces[0].id);
      if (lists.length > 0) {
        const customTask = await clickUpService.createTask(lists[0].id, {
          name: 'Review Weekly Analytics',
          description: 'Check key metrics and prepare report',
          priority: 3,
          tags: ['analytics', 'weekly-review'],
        });
        console.log(`✅ Created custom task: ${customTask.id}\n`);
      }
    }

    console.log('🎉 Examples completed successfully!');

  } catch (error) {
    console.error('❌ Error running examples:', error);
    process.exit(1);
  }
}

// Run examples
exampleUsage();
