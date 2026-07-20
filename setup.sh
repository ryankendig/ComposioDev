#!/bin/bash

echo "🚀 Setting up Amplitude-ClickUp MCP Integration"
echo "==============================================="
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your credentials."
    echo ""
    echo "⚠️  Required configuration:"
    echo "   1. Set CLICKUP_API_KEY in .env"
    echo "   2. Set CLICKUP_WORKSPACE_ID in .env"
    echo "   3. Configure Amplitude MCP OAuth (see INTEGRATION_README.md)"
    echo ""
else
    echo "ℹ️  .env file already exists, skipping..."
    echo ""
fi

# Build the project
echo "🔨 Building TypeScript project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build completed"
echo ""

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your API credentials"
echo "  2. Configure Amplitude MCP in your MCP client (see INTEGRATION_README.md)"
echo "  3. Run 'npm start' to begin syncing"
echo ""
echo "For detailed instructions, see INTEGRATION_README.md"
