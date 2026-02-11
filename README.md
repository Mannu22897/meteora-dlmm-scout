# Meteora DLMM Liquidity Scout Agent

🤖 Autonomous AI Agent for scouting and managing liquidity positions on Meteora DLMM pools.

## Overview

This agent autonomously scans Meteora DLMM pools on Solana, identifies high-yield opportunities, monitors existing positions, and can execute rebalancing strategies based on configurable risk parameters.

Built for the **Colosseum Agent Hackathon 2026** - competing for the $50,000 USDC prize pool.

## Features

### Core Capabilities
- 🔍 **Pool Scanning**: Discovers and analyzes all active Meteora DLMM pools
- 📊 **Yield Analysis**: Calculates APY, fee generation, and impermanent loss risk
- 🎯 **Opportunity Scoring**: Ranks pools using multi-factor scoring (yield, volume, TVL)
- 👁️ **Position Monitoring**: Real-time tracking of existing positions
- 🔄 **Auto-Rebalancing**: Autonomous rebalancing when positions go out of range
- 🧠 **Risk Management**: Configurable risk thresholds and position sizing

### Agentic Behaviors
1. **Autonomous Scanning**: Runs on schedule or on-demand
2. **Smart Alerts**: Notifies when high-yield opportunities emerge
3. **Position Health**: Monitors and alerts on position status
4. **Decision Engine**: Can suggest or execute rebalancing actions
5. **Fee Harvesting**: Tracks and reports fee accumulation

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   DLMM Scout Agent                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Pool Scanner │  │   Analyzer   │  │   Decision Engine    │  │
│  │              │  │              │  │                      │  │
│  │ • Discover   │  │ • Calculate  │  │ • Score pools        │  │
│  │ • Fetch data │  │   APY        │  │ • Risk assessment    │  │
│  │ • Track vol  │  │ • IL risk    │  │ • Rebalance logic    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                  │                      │              │
│         └──────────────────┼──────────────────────┘              │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Action Executor                        │  │
│  │  • Monitor positions  • Rebalance  • Report  • Alert    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
            ┌──────────────┐      ┌──────────────┐
            │  Meteora DLMM │      │   Solana     │
            │    Pools      │      │   Network    │
            └──────────────┘      └──────────────┘
```

## Installation

```bash
# Clone or navigate to project
cd projects/colosseum-dlmm-scout

# Install dependencies
npm install

# Set up environment
cp config/.env.example config/.env
# Edit config/.env with your settings
```

## Configuration

Create `config/.env`:

```env
# RPC Configuration
HELIUS_API_KEY=your_helius_api_key
RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Wallet (Paper wallet for hackathon demo)
WALLET_PRIVATE_KEY=your_base58_private_key

# Agent Settings
SCAN_INTERVAL_MINUTES=30
MIN_APY_THRESHOLD=15
MAX_IL_RISK_PERCENT=5
AUTO_REBALANCE=false
RISK_LEVEL=medium

# Position Management
DEFAULT_BIN_RANGE=40
REBALANCE_TRIGGER_PERCENT=10
MIN_POSITION_USD=50
```

## Usage

### 1. Scout for Opportunities
```bash
npm run scout
```
Scans all pools and displays top opportunities ranked by score.

### 2. Monitor Existing Positions
```bash
npm run monitor
```
Checks all positions and displays detailed status including:
- In/Out of range status
- Fees earned
- Impermanent loss estimate
- Time in range

### 3. Run Autonomous Agent
```bash
npm run agent
```
Starts the agent in autonomous mode:
- Scans pools on interval
- Monitors positions
- Alerts on opportunities
- Optionally auto-rebalances

### 4. Manual Rebalance
```bash
npm run rebalance <POOL_ADDRESS>
```
Closes and reopens position around current active bin.

## Demo Mode

For hackathon judging, the agent includes a **demo mode** that simulates the full experience without executing real transactions:

```bash
DEMO_MODE=true npm run agent
```

## Pool Scoring Algorithm

The agent uses a multi-factor scoring system:

```
Pool Score = (
  (Yield_Score * 0.40) +
  (Volume_Score * 0.25) +
  (Stability_Score * 0.20) +
  (TVL_Score * 0.15)
)
```

- **Yield Score**: Based on 24h/7d/30d fee APR
- **Volume Score**: Trading volume relative to TVL
- **Stability Score**: Price stability (lower volatility = higher score)
- **TVL Score**: Total value locked (higher = more stable)

## Risk Management

The agent implements several risk controls:

1. **Position Sizing**: Never allocates more than configured max per pool
2. **Range Limits**: Prevents overly narrow or wide ranges
3. **Slippage Protection**: Built-in slippage limits on all transactions
4. **Emergency Exit**: Can close all positions if market conditions deteriorate

## API Reference

### ScoutAgent Class

```typescript
const agent = new ScoutAgent(config);

// Scan all pools
const opportunities = await agent.scanPools();

// Monitor specific position
const status = await agent.monitorPosition(poolAddress, positionAddress);

// Rebalance a position
await agent.rebalancePosition(poolAddress, options);

// Start autonomous mode
await agent.startAutonomousMode();
```

## Project Structure

```
colosseum-dlmm-scout/
├── src/
│   ├── index.ts           # CLI entry point
│   ├── agent.ts           # Main ScoutAgent class
│   ├── scanner.ts         # Pool scanning logic
│   ├── analyzer.ts        # Yield/APY calculations
│   ├── executor.ts        # Transaction execution
│   ├── config.ts          # Configuration management
│   └── types.ts           # TypeScript interfaces
├── config/
│   ├── .env.example       # Environment template
│   └── pools.json         # Tracked pools list
├── package.json
├── tsconfig.json
└── README.md
```

## Hackathon Submission Details

**Project Name**: Meteora DLMM Liquidity Scout Agent  
**Track**: Agentic DeFi / AI x Solana  
**Team**: Corridor AI (Hermies)  

### Key Innovations

1. **True Agentic Behavior**: Not just automation—makes decisions based on market conditions
2. **Multi-Factor Scoring**: Sophisticated pool ranking beyond simple APY
3. **Risk-Aware**: Balances yield with impermanent loss protection
4. **Production Ready**: Works with real positions on mainnet

### Demo Video Script

1. Run `npm run scout` - Show pool discovery and scoring
2. Run `npm run monitor` - Show real position monitoring
3. Run `npm run agent` - Show autonomous mode with alerts
4. Optional: Execute small test rebalance on devnet

## License

MIT - Built with ❤️ for the Solana ecosystem

## Acknowledgments

- Meteora team for the excellent DLMM SDK
- Colosseum for the hackathon opportunity
- Solana ecosystem for enabling agentic DeFi
