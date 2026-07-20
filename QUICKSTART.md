# Amplitude-ClickUp MCP Integration: Quick Start

## What This Integration Does

This integration automatically syncs insights from Amplitude analytics to ClickUp tasks, enabling product teams to:

1. **Track Metrics**: Automatically create tasks when key metrics change
2. **Monitor Experiments**: Get notified about A/B test results
3. **Detect Anomalies**: Receive alerts for unusual patterns
4. **Bridge Analytics & Execution**: Connect data insights directly to team workflows

## 5-Minute Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
```bash
CLICKUP_API_KEY=pk_your_key_here
CLICKUP_WORKSPACE_ID=your_workspace_id
```

### 3. Build & Run

```bash
npm run build
npm start
```

## Getting Your Credentials

### ClickUp API Key

1. Open ClickUp → Settings → Apps
2. Click "Generate" under API Token
3. Copy the token to your `.env` file

### ClickUp Workspace ID

1. Go to ClickUp Settings → Workspace
2. Find the ID in the URL: `https://app.clickup.com/{workspace_id}/settings`

### Amplitude MCP (Optional Setup)

The integration works with mock data by default. To connect to real Amplitude data:

1. Add Amplitude MCP to your MCP client configuration:
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

2. Complete OAuth authentication when prompted

## What Happens After Setup

Once configured, the integration will:

1. ✅ Connect to both Amplitude and ClickUp
2. 📊 Fetch insights from Amplitude (metrics, experiments, anomalies)
3. 📝 Create ClickUp tasks for each insight with full context
4. 🔄 Sync periodically (every hour by default)
5. 📈 Track mappings between insights and tasks

## Example Tasks Created

### Metric Alert
**Title**: "Daily Active Users Trending Up"
**Description**: DAU increased by 15% over the last 7 days. Consider scaling infrastructure.
**Priority**: Medium
**Tags**: `amplitude-insight`, `insight-metric`

### Experiment Result
**Title**: "Experiment 'New Onboarding' Ready for Review"
**Description**: A/B test shows 23% improvement in completion rate. Statistically significant.
**Priority**: High
**Tags**: `amplitude-insight`, `insight-experiment`

### Anomaly Detection
**Title**: "Unusual Drop in Conversion Rate"
**Description**: Conversion rate dropped by 12% in the last 24 hours. Requires investigation.
**Priority**: Critical
**Tags**: `amplitude-insight`, `insight-anomaly`

## Configuration Options

### Continuous Sync

To run continuous syncing (recommended for production):
```bash
SYNC_INTERVAL_MINUTES=60  # Sync every hour
```

### One-Time Sync

For testing or one-off syncs:
```bash
SYNC_INTERVAL_MINUTES=0
```

### Logging

Adjust log verbosity:
```bash
LOG_LEVEL=debug  # debug, info, warn, error
```

## Troubleshooting

### "Invalid ClickUp API key"
- Double-check your API key in `.env`
- Regenerate the key in ClickUp if needed

### "No default list configured"
- Ensure your ClickUp workspace has at least one space with a list
- The integration automatically uses the first list found

### Need Help?
See `INTEGRATION_README.md` for detailed documentation and troubleshooting.

## Architecture

```
Amplitude Analytics → Generate Insights → Create ClickUp Tasks → Sync Updates
```

## Repository Structure

```
├── src/                    # Source code
│   ├── services/          # Amplitude & ClickUp API clients
│   ├── integrations/      # Integration orchestrator
│   ├── types/             # TypeScript definitions
│   └── utils/             # Configuration & logging
├── dist/                   # Compiled JavaScript
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── .env.example           # Environment template
└── INTEGRATION_README.md  # Full documentation
```

## Next Steps

- ✅ Run `npm start` to test the integration
- 📖 Read `INTEGRATION_README.md` for advanced features
- 🔧 Customize insight detection in `src/services/amplitude.service.ts`
- 🎯 Adjust task templates in `src/integrations/amplitude-clickup.ts`

---

Built for Bikini Bottom Rebellion's analytics workflow 🤘
