#!/usr/bin/env node

import { ScoutAgent } from './agent.js';
import { loadConfig } from './config.js';
import chalk from 'chalk';

const command = process.argv[2];
const arg = process.argv[3];

async function main() {
  console.log(chalk.cyan(`
╔══════════════════════════════════════════════════════════╗
║              🤖 METEORA DLMM SCOUT AGENT                 ║
║              Autonomous DeFi Intelligence                ║
╚══════════════════════════════════════════════════════════╝
  `));

  const agent = new ScoutAgent();

  switch (command) {
    case 'scout':
      const scores = await agent.scanPools();
      
      console.log(chalk.green('\n📊 TOP OPPORTUNITIES:'));
      console.log(chalk.gray('─'.repeat(60)));
      
      scores.slice(0, 5).forEach((score, i) => {
        const emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
        console.log(`\n${emoji} #${i + 1} ${score.poolAddress.slice(0, 20)}...`);
        console.log(`   Score: ${score.totalScore.toFixed(1)}/100 | APY: ${score.estimatedApy.toFixed(1)}%`);
        console.log(`   Risk: ${score.ilRisk}% IL | ${score.recommendation.toUpperCase()}`);
      });
      break;

    case 'monitor':
      const positions = await agent.monitorPositions(arg);
      
      if (positions.length === 0) {
        console.log(chalk.yellow('\n📭 No positions found'));
      } else {
        console.log(chalk.green(`\n📊 MONITORING ${positions.length} POSITION(S):`));
        console.log(chalk.gray('─'.repeat(60)));
        
        positions.forEach(pos => {
          const emoji = pos.position.isInRange ? '🟢' : '🔴';
          const healthColor = pos.health === 'healthy' ? chalk.green : 
                             pos.health === 'warning' ? chalk.yellow : chalk.red;
          
          console.log(`\n${emoji} Position: ${pos.position.address.slice(0, 20)}...`);
          console.log(`   Health: ${healthColor(pos.health.toUpperCase())}`);
          console.log(`   Range: ${pos.position.lowerBin} - ${pos.position.upperBin}`);
          console.log(`   Fees Earned: $${pos.totalFeesUsd.toFixed(4)}`);
          console.log(`   Rebalance Needed: ${pos.rebalanceNeeded ? 'YES ⚠️' : 'No ✓'}`);
        });
      }
      break;

    case 'agent':
      await agent.startAutonomousMode();
      break;

    case 'rebalance':
      if (!arg) {
        console.error(chalk.red('❌ Please provide a pool address'));
        console.log(chalk.gray('Usage: npm run rebalance <POOL_ADDRESS>'));
        process.exit(1);
      }
      await agent.evaluateAndRebalance(arg, true);
      break;

    case 'status':
      const status = await agent.getAgentStatus();
      console.log(status);
      break;

    case 'history':
      const history = agent.getScanHistory();
      console.log(chalk.green(`\n📜 SCAN HISTORY (${history.length} scans):`));
      
      history.slice(-10).forEach((scan, i) => {
        console.log(`\n${i + 1}. ${scan.timestamp.toISOString()}`);
        console.log(`   Pools: ${scan.poolsScanned} | Opportunities: ${scan.opportunities.length}`);
        if (scan.topPick) {
          console.log(`   Top Pick: ${scan.topPick.poolAddress.slice(0, 20)}... (${scan.topPick.totalScore.toFixed(0)}/100)`);
        }
      });
      break;

    default:
      console.log(chalk.blue(`
Usage:
  npm run scout                  Scan all pools for opportunities
  npm run monitor [POOL]         Monitor positions (optionally for specific pool)
  npm run agent                  Start autonomous agent mode
  npm run rebalance <POOL>       Evaluate and rebalance a position
  npm run status                 Show agent status
  npm run history                Show scan history

Environment Variables:
  DEMO_MODE=true                 Run without real transactions
  RISK_LEVEL=low|medium|high     Set agent risk tolerance
  AUTO_REBALANCE=true|false      Enable/disable auto-rebalancing

Examples:
  DEMO_MODE=true npm run scout
  RISK_LEVEL=high npm run agent
      `));
  }

  process.exit(0);
}

main().catch(err => {
  console.error(chalk.red('❌ Error:'), err.message);
  process.exit(1);
});
