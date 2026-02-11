#!/bin/bash

# Meteora DLMM Scout Agent - Interactive Demo
# This script demonstrates the agent's capabilities in demo mode

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     🤖 METEORA DLMM SCOUT AGENT - INTERACTIVE DEMO       ║"
echo "║           Colosseum Agent Hackathon 2026                 ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "This demo runs in SAFE MODE - no real transactions"
echo ""

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "Choose a demo scenario:"
echo ""
echo "1) 🎯 Scout Mode - Scan all pools and find opportunities"
echo "2) 👁️  Monitor Mode - Check existing positions"
echo "3) 🧠 Agent Mode - Full autonomous operation (5 min)"
echo "4) 🔄 Rebalance Demo - Show rebalance decision process"
echo "5) 📊 Full Walkthrough - Complete agent demonstration"
echo ""
read -p "Enter choice (1-5): " choice

case $choice in
  1)
    echo ""
    echo "🎯 Running Pool Scout..."
    echo "The agent will scan all Meteora pools and score them."
    echo ""
    DEMO_MODE=true npx tsx src/index.ts scout
    ;;
  2)
    echo ""
    echo "👁️  Running Position Monitor..."
    echo "The agent will check your positions and report status."
    echo ""
    DEMO_MODE=true npx tsx src/index.ts monitor
    ;;
  3)
    echo ""
    echo "🧠 Starting Autonomous Agent..."
    echo "The agent will run for 5 minutes, scanning and making decisions."
    echo "Press Ctrl+C to stop early"
    echo ""
    timeout 300 DEMO_MODE=true npx tsx src/index.ts agent || true
    ;;
  4)
    echo ""
    echo "🔄 Rebalance Decision Demo..."
    echo "Showing how the agent decides when to rebalance."
    echo ""
    DEMO_MODE=true npx tsx src/index.ts rebalance BGm1tav58oGcsQJehL9WXBFXF7D27vZsKefj4xJKD5Y
    ;;
  5)
    echo ""
    echo "📊 FULL WALKTHROUGH"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "Step 1: Agent Personality & Startup"
    echo "────────────────────────────────────"
    DEMO_MODE=true npx tsx src/index.ts status
    echo ""
    read -p "Press Enter to continue..."
    
    echo ""
    echo "Step 2: Pool Discovery & Scoring"
    echo "────────────────────────────────────"
    DEMO_MODE=true npx tsx src/index.ts scout
    echo ""
    read -p "Press Enter to continue..."
    
    echo ""
    echo "Step 3: Position Monitoring"
    echo "────────────────────────────────────"
    DEMO_MODE=true npx tsx src/index.ts monitor
    echo ""
    read -p "Press Enter to continue..."
    
    echo ""
    echo "Step 4: Autonomous Decision Making"
    echo "────────────────────────────────────"
    timeout 60 DEMO_MODE=true npx tsx src/index.ts agent || true
    echo ""
    echo "✅ Demo complete!"
    ;;
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Demo complete! To run with real transactions:"
echo "  1. Copy config/.env.example to config/.env"
echo "  2. Add your wallet private key and Helius API key"
echo "  3. Run: npm run scout (or monitor, agent, rebalance)"
echo "═══════════════════════════════════════════════════════════"
echo ""
