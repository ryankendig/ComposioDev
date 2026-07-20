#!/usr/bin/env node

import { AmplitudeService } from './services/amplitude.service.js';
import { ClickUpService } from './services/clickup.service.js';
import { AmplitudeClickUpIntegration } from './integrations/amplitude-clickup.js';
import { loadConfig, Logger } from './utils/config.js';

/**
 * Main entry point for the Amplitude-ClickUp MCP Integration
 */
async function main() {
  console.log('🚀 Amplitude-ClickUp MCP Integration');
  console.log('=====================================\n');

  try {
    // Load configuration
    const config = loadConfig();
    const logger = new Logger(config.logLevel);

    logger.info('Configuration loaded successfully');
    logger.info(`Amplitude region: ${config.amplitude.region}`);
    logger.info(`Amplitude URL: ${config.amplitude.apiUrl}`);
    logger.info(`ClickUp workspace: ${config.clickup.workspaceId || 'Not configured'}`);

    // Initialize services
    const amplitudeService = new AmplitudeService(config.amplitude, logger);
    const clickUpService = new ClickUpService(config.clickup, logger);

    // Create integration
    const integration = new AmplitudeClickUpIntegration(
      amplitudeService,
      clickUpService,
      logger
    );

    // Initialize
    await integration.initialize();

    // Run initial sync
    logger.info('\n📊 Running initial sync...');
    const syncResult = await integration.syncInsights();

    // Display results
    console.log('\n✅ Sync Results:');
    console.log(`   Insights processed: ${syncResult.insightsProcessed}`);
    console.log(`   Tasks created: ${syncResult.tasksCreated}`);
    console.log(`   Tasks updated: ${syncResult.tasksUpdated}`);
    
    if (syncResult.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${syncResult.errors.length}`);
      syncResult.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }

    // Display stats
    const stats = integration.getSyncStats();
    console.log(`\n📈 Statistics:`);
    console.log(`   Total insight-to-task mappings: ${stats.totalMappings}`);

    // Setup periodic sync if configured
    if (config.syncIntervalMinutes > 0) {
      logger.info(`\n⏰ Scheduling periodic sync every ${config.syncIntervalMinutes} minutes`);
      logger.info('Press Ctrl+C to stop\n');

      setInterval(async () => {
        logger.info('Running scheduled sync...');
        const result = await integration.syncInsights();
        logger.info(`Scheduled sync completed: ${result.tasksCreated} created, ${result.tasksUpdated} updated`);
      }, config.syncIntervalMinutes * 60 * 1000);

      // Keep the process running
      process.on('SIGINT', () => {
        logger.info('\n\n👋 Shutting down gracefully...');
        process.exit(0);
      });
    } else {
      logger.info('\n✨ One-time sync completed. Set SYNC_INTERVAL_MINUTES > 0 for continuous sync.');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run main function
main();
