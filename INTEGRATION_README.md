# Amplitude-ClickUp MCP Integration

A powerful integration that connects Amplitude analytics with ClickUp task management through the Model Context Protocol (MCP). Automatically sync insights, metrics, and experiments from Amplitude to ClickUp tasks for seamless product analytics workflows.

## Overview

This integration enables teams to:
- **Automatically create ClickUp tasks** from Amplitude insights
- **Sync analytics data** to task management workflows
- **Track experiments and A/B tests** as tasks
- **Monitor key metrics** with automated alerts
- **Bridge analytics and execution** in one workflow

## Features

- 🔄 **Bidirectional Sync**: Keep Amplitude insights and ClickUp tasks in sync
- 📊 **Insight Generation**: Automatically detect trends, anomalies, and opportunities
- 🎯 **Priority Mapping**: Critical insights become high-priority tasks
- 🏷️ **Auto-tagging**: Tasks are tagged by insight type for easy filtering
- ⏰ **Scheduled Syncs**: Configurable interval for continuous monitoring
- 🔐 **Secure**: Uses OAuth for Amplitude and API tokens for ClickUp

## Prerequisites

- Node.js 18+ and npm
- Amplitude account with MCP access
- ClickUp account with API access
- API credentials for both platforms

## Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Configure environment variables**:
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```bash
# Amplitude Configuration
AMPLITUDE_API_URL=https://mcp.amplitude.com/mcp
AMPLITUDE_REGION=US  # or EU

# ClickUp Configuration
CLICKUP_API_KEY=pk_your_api_key_here
CLICKUP_WORKSPACE_ID=your_workspace_id

# Integration Settings
SYNC_INTERVAL_MINUTES=60
LOG_LEVEL=info
```

3. **Build the project**:
```bash
npm run build
```

## Getting API Credentials

### Amplitude MCP Setup

The Amplitude MCP server uses OAuth authentication:

1. Add the Amplitude MCP server to your MCP client configuration (Cursor, Claude Desktop, etc.)
2. Use the appropriate regional endpoint:
   - **US**: `https://mcp.amplitude.com/mcp`
   - **EU**: `https://mcp.eu.amplitude.com/mcp`
3. Complete OAuth flow when prompted (opens browser)

Example MCP client configuration:
```json
{
  "mcpServers": {
    "amplitude": {
      "type": "http",
      "url": "https://mcp.amplitude.com/mcp"
    }
  }
}
```

### ClickUp API Key

1. Go to ClickUp Settings → Apps
2. Click "Generate" under API Token
3. Copy your API token to `.env` as `CLICKUP_API_KEY`

### ClickUp Workspace ID

Find your workspace ID:
1. Open ClickUp
2. Go to Settings → Workspace
3. The ID is in the URL: `https://app.clickup.com/{workspace_id}/settings`

## Usage

### Basic Usage

Run a one-time sync:
```bash
npm start
```

### Continuous Sync

Set `SYNC_INTERVAL_MINUTES` in `.env` to enable periodic syncing:
```bash
SYNC_INTERVAL_MINUTES=60  # Sync every hour
```

### Development Mode

```bash
npm run dev
```

## Integration Architecture

```
┌─────────────────┐
│   Amplitude     │
│   MCP Server    │
│  (Analytics)    │
└────────┬────────┘
         │
         │ OAuth
         │ MCP Protocol
         │
    ┌────▼─────────────────┐
    │  Integration Layer   │
    │                      │
    │  • Fetch insights    │
    │  • Generate tasks    │
    │  • Sync mappings     │
    │  • Handle updates    │
    └────┬─────────────────┘
         │
         │ REST API
         │ Bearer Token
         │
┌────────▼────────┐
│    ClickUp      │
│      API        │
│ (Task Manager)  │
└─────────────────┘
```

## How It Works

1. **Insight Discovery**: The integration queries Amplitude for:
   - Key metrics and their trends
   - A/B test results
   - User behavior anomalies
   - Performance indicators

2. **Task Generation**: Each insight is converted to a ClickUp task with:
   - Descriptive title
   - Detailed context and data
   - Appropriate priority level
   - Relevant tags for categorization

3. **Sync Management**: The system:
   - Tracks insight-to-task mappings
   - Updates existing tasks when insights change
   - Creates new tasks for new insights
   - Maintains sync history

## Configuration Options

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AMPLITUDE_API_URL` | Amplitude MCP endpoint | `https://mcp.amplitude.com/mcp` | No |
| `AMPLITUDE_REGION` | Region (US or EU) | `US` | No |
| `CLICKUP_API_KEY` | ClickUp API token | - | Yes |
| `CLICKUP_WORKSPACE_ID` | ClickUp workspace ID | - | Yes |
| `CLICKUP_API_URL` | ClickUp API base URL | `https://api.clickup.com/api/v2` | No |
| `SYNC_INTERVAL_MINUTES` | Minutes between syncs (0 = one-time) | `60` | No |
| `LOG_LEVEL` | Logging verbosity | `info` | No |

### Priority Mapping

Amplitude insight priorities map to ClickUp priorities:

| Amplitude | ClickUp | Description |
|-----------|---------|-------------|
| Critical | 1 (Urgent) | Requires immediate attention |
| High | 2 (High) | Important, address soon |
| Medium | 3 (Normal) | Standard priority |
| Low | 4 (Low) | Nice to have |

## Example Workflows

### Monitor Key Metrics

Set up the integration to automatically create tasks when:
- Daily Active Users change significantly
- Conversion rates drop
- Error rates spike
- Performance degrades

### Track Experiments

Automatically create tasks for:
- Experiments ready for review
- A/B tests reaching significance
- Feature flags to rollout
- Experiment results requiring action

### Anomaly Detection

Get notified via tasks when:
- Unusual patterns are detected
- Metrics deviate from expected ranges
- User behavior changes significantly

## Troubleshooting

### "Invalid ClickUp API key"

- Verify your API key in ClickUp Settings → Apps
- Ensure the key is correctly set in `.env`
- Check for extra spaces or newlines

### "Amplitude MCP requires OAuth"

- The Amplitude MCP server requires OAuth authentication
- Add it to your MCP client configuration
- Complete the browser OAuth flow when prompted

### "No default list configured"

- Ensure your ClickUp workspace has at least one space and list
- The integration uses the first list found by default
- Or call `setDefaultList(listId)` programmatically

### Tasks not creating

- Check the logs with `LOG_LEVEL=debug`
- Verify ClickUp workspace and list IDs
- Ensure API key has necessary permissions

## Development

### Project Structure

```
amplitude-clickup-mcp-integration/
├── src/
│   ├── index.ts                      # Main entry point
│   ├── services/
│   │   ├── amplitude.service.ts      # Amplitude MCP client
│   │   └── clickup.service.ts        # ClickUp API client
│   ├── integrations/
│   │   └── amplitude-clickup.ts      # Integration orchestrator
│   ├── types/
│   │   └── index.ts                  # TypeScript types
│   └── utils/
│       └── config.ts                 # Configuration & logging
├── dist/                             # Compiled output
├── package.json
├── tsconfig.json
└── .env.example
```

### Adding New Features

1. Extend service classes in `src/services/`
2. Update type definitions in `src/types/`
3. Modify integration logic in `src/integrations/`
4. Rebuild with `npm run build`

## API Reference

### AmplitudeService

- `search(query)` - Search Amplitude resources
- `queryChart(chartId)` - Get chart data
- `queryExperiment(experimentId)` - Get experiment results
- `getDashboard(dashboardId)` - Get dashboard details
- `generateInsights()` - Generate actionable insights
- `testConnection()` - Verify connectivity

### ClickUpService

- `getSpaces()` - List workspace spaces
- `getLists(spaceId)` - List space lists
- `createTask(listId, task)` - Create a new task
- `updateTask(taskId, updates)` - Update existing task
- `getTask(taskId)` - Get task details
- `searchTasks(listId, query)` - Search tasks
- `testConnection()` - Verify connectivity

### AmplitudeClickUpIntegration

- `initialize()` - Setup integration
- `setDefaultList(listId)` - Set target list
- `syncInsights()` - Run sync process
- `createTaskFromAmplitudeData(type, id)` - Create task from specific data
- `getSyncStats()` - Get sync statistics

## Contributing

Contributions welcome! Areas for improvement:
- Enhanced insight detection algorithms
- Custom sync rules and filters
- Bi-directional sync (ClickUp → Amplitude)
- Support for more MCP clients
- Additional integrations

## License

MIT

## Support

For issues and questions:
- Check the troubleshooting section
- Review [Amplitude MCP documentation](https://github.com/amplitude/mcp-server-guide)
- Review [ClickUp API documentation](https://clickup.com/api)

---

Built with ❤️ for product teams who love data-driven workflows
