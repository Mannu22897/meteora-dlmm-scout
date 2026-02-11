import { Connection, Keypair } from '@solana/web3.js';
import cron from 'node-cron';
import chalk from 'chalk';
import { PoolScanner } from './scanner.js';
import { PositionExecutor } from './executor.js';
import { loadConfig, validateConfig } from './config.js';
import { AgentConfig, PoolScore, PositionStatus, ScanResult, AgentPersonality } from './types.js';
import { SelfReporter } from './reporter.js';
import { DecisionEngine } from './decision.js';

/**
 * ScoutAgent - An Autonomous DeFi Agent
 * 
 * This agent operates with true autonomy:
 * - Self-schedules actions based on market conditions
 * - Adapts strategy based on performance
 * - Self-reports status without prompting
 * - Makes independent rebalancing decisions
 * - Maintains a "personality" that influences risk tolerance
 */
export class ScoutAgent {
  private connection: Connection;
  private wallet: Keypair;
  private config: AgentConfig;
  private scanner: PoolScanner;
  private executor: PositionExecutor;
  private reporter: SelfReporter;
  private decisionEngine: DecisionEngine;
  private isRunning = false;
  private scanHistory: ScanResult[] = [];
  private performanceMetrics = {
    totalScans: 0,
    opportunitiesFound: 0,
    rebalancesExecuted: 0,
    feesEarned: 0,
    startTime: Date.now(),
  };
  private personality: AgentPersonality;

  constructor(config?: AgentConfig) {
    this.config = config || loadConfig();
    this.connection = new Connection(this.config.rpcUrl, 'confirmed');
    
    // Initialize agent personality based on risk level
    this.personality = this.initializePersonality();
    
    if (this.config.demoMode) {
      console.log(chalk.yellow('🎮 DEMO MODE: No real transactions will be executed'));
      this.wallet = Keypair.generate();
    } else {
      if (!this.config.walletPrivateKey) {
        throw new Error('Wallet private key required');
      }
      // Decode base58 private key
      const secretKey = new Uint8Array(
        this.config.walletPrivateKey.split(',').map(n => parseInt(n.trim()))
      );
      this.wallet = Keypair.fromSecretKey(secretKey);
    }

    this.scanner = new PoolScanner(this.connection);
    this.executor = new PositionExecutor(this.connection, this.wallet, this.config);
    this.reporter = new SelfReporter(this.wallet.publicKey.toBase58());
    this.decisionEngine = new DecisionEngine(this.config, this.personality);

    this.logAgentStartup();
  }

  private initializePersonality(): AgentPersonality {
    const personalities: Record<string, AgentPersonality> = {
      low: {
        name: 'Conservative Guardian',
        riskTolerance: 0.3,
        rebalanceThreshold: 15,
        description: 'Prioritizes capital preservation over yield',
        quote: "Safety first, returns second. I'll protect your capital.",
      },
      medium: {
        name: 'Balanced Strategist', 
        riskTolerance: 0.6,
        rebalanceThreshold: 10,
        description: 'Balances risk and reward with measured decisions',
        quote: "Opportunity favors the prepared mind. I'm always watching.",
      },
      high: {
        name: 'Aggressive Hunter',
        riskTolerance: 0.9,
        rebalanceThreshold: 5,
        description: 'Actively seeks maximum yield, accepts higher risk',
        quote: "Fortune favors the bold. Let's find those alpha pools!",
      },
    };

    return personalities[this.config.riskLevel] || personalities.medium;
  }

  private logAgentStartup(): void {
    console.log(chalk.cyan(`
╔══════════════════════════════════════════════════════════╗
║              🤖 METEORA DLMM SCOUT AGENT                 ║
║              Autonomous DeFi Intelligence                ║
╚══════════════════════════════════════════════════════════╝
    `));
    console.log(chalk.gray(`Personality: ${chalk.bold(this.personality.name)}`));
    console.log(chalk.gray(`Risk Tolerance: ${(this.personality.riskTolerance * 100).toFixed(0)}%`));
    console.log(chalk.gray(`Quote: "${this.personality.quote}"\n`));
  }

  async scanPools(): Promise<PoolScore[]> {
    console.log(chalk.blue('\n🔍 [AUTONOMOUS SCAN] Analyzing market opportunities...'));
    const startTime = Date.now();

    const pools = await this.scanner.scanAllPools();
    const scores: PoolScore[] = [];

    for (const pool of pools) {
      const score = this.scanner.calculatePoolScore(pool);
      scores.push(score);
    }

    // Sort by total score descending
    scores.sort((a, b) => b.totalScore - a.totalScore);

    // Agent makes observations
    const observations = this.decisionEngine.analyzeMarketConditions(scores);
    
    const result: ScanResult = {
      timestamp: new Date(),
      poolsScanned: pools.length,
      opportunities: scores.filter(s => s.totalScore >= 60),
      topPick: scores[0] || null,
      marketConditions: observations,
    };

    this.scanHistory.push(result);
    if (this.scanHistory.length > 100) this.scanHistory.shift();

    this.performanceMetrics.totalScans++;
    this.performanceMetrics.opportunitiesFound += result.opportunities.length;

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(chalk.green(`✅ Scan complete in ${duration}s`));
    console.log(chalk.gray(`   Agent observation: "${observations.summary}"`));

    // Self-report if significant findings
    if (result.opportunities.length > 0 && result.opportunities[0].totalScore > 80) {
      await this.reporter.reportOpportunity(result.opportunities[0]);
    }

    return scores;
  }

  async monitorPositions(poolAddress?: string): Promise<PositionStatus[]> {
    console.log(chalk.blue('\n👁️ [AUTONOMOUS MONITOR] Checking position health...'));

    let statuses: PositionStatus[] = [];

    if (poolAddress) {
      statuses = await this.executor.monitorPosition(poolAddress);
    } else {
      // Monitor all pools
      const pools = await this.scanner.scanAllPools();
      for (const pool of pools) {
        const poolStatuses = await this.executor.monitorPosition(pool.address);
        statuses.push(...poolStatuses);
      }
    }

    // Agent analyzes health
    for (const status of statuses) {
      const analysis = this.decisionEngine.analyzePositionHealth(status);
      if (analysis.requiresAttention) {
        console.log(chalk.yellow(`   ⚠️ Agent alert: ${analysis.reason}`));
      }
    }

    return statuses;
  }

  async evaluateAndRebalance(poolAddress: string, autoExecute = false): Promise<void> {
    const pool = this.scanner.getCachedPool(poolAddress);
    const poolName = pool ? `${pool.tokenX.symbol}-${pool.tokenY.symbol}` : poolAddress.slice(0, 16);
    
    console.log(chalk.blue(`\n🔄 [AUTONOMOUS DECISION] Evaluating ${poolName}...`));

    const statuses = await this.executor.monitorPosition(poolAddress);

    for (const status of statuses) {
      // Agent uses decision engine to determine action
      const decision = this.decisionEngine.makeRebalanceDecision(status, this.personality);
      
      if (decision.shouldAct) {
        console.log(chalk.yellow(`\n   🤖 Agent Decision: ${decision.action.toUpperCase()}`));
        console.log(`      Reasoning: ${decision.reasoning}`);
        console.log(`      Confidence: ${decision.confidence}%`);
        
        if (decision.suggestedRange) {
          console.log(`      Target Range: ${decision.suggestedRange.lowerBin} - ${decision.suggestedRange.upperBin}`);
        }

        if (autoExecute && this.config.autoRebalance && decision.shouldAct) {
          if (decision.action === 'rebalance') {
            console.log(chalk.blue('\n   🚀 Executing autonomous rebalance...'));
            try {
              const sigs = await this.executor.executeRebalance(
                poolAddress,
                status.position.address,
                decision.suggestedRange!
              );
              this.performanceMetrics.rebalancesExecuted++;
              console.log(chalk.green(`   ✅ Success! TX: ${sigs[0].slice(0, 30)}...`));
              
              // Self-report the action
              await this.reporter.reportAction('rebalance', poolName, sigs[0]);
            } catch (error) {
              console.error(chalk.red('   ❌ Failed:'), (error as Error).message);
              await this.reporter.reportError('rebalance_failed', (error as Error).message);
            }
          } else if (decision.action === 'close') {
            console.log(chalk.yellow('   📤 Closing position...'));
            // Implement close logic
          }
        }
      } else {
        console.log(chalk.green(`   ✅ Position healthy - no action needed`));
        console.log(chalk.gray(`      Agent notes: ${decision.reasoning}`));
      }
    }
  }

  async startAutonomousMode(): Promise<void> {
    const errors = validateConfig(this.config);
    if (errors.length > 0) {
      console.error(chalk.red('Configuration errors:'));
      errors.forEach(e => console.error(`  - ${e}`));
      return;
    }

    console.log(chalk.green('\n🤖 Entering full autonomous mode...'));
    console.log(chalk.gray(`   The agent will now operate independently.`));
    console.log(chalk.gray(`   It will scan, analyze, decide, and act without prompting.`));
    console.log(chalk.gray(`   Press Ctrl+C to regain control\n`));

    this.isRunning = true;

    // Initial cycle
    await this.runAutonomousCycle();

    // Schedule periodic cycles
    const intervalMs = this.config.scanIntervalMinutes * 60 * 1000;
    const intervalId = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(intervalId);
        return;
      }
      await this.runAutonomousCycle();
    }, intervalMs);

    // Keep process alive
    while (this.isRunning) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  stop(): void {
    this.isRunning = false;
    this.reporter.generateSessionReport(this.performanceMetrics);
    console.log(chalk.yellow('\n🛑 Agent stopped. Session report generated.'));
  }

  private async runAutonomousCycle(): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log(chalk.blue(`\n[${timestamp}] 🔄 Autonomous Cycle #${this.performanceMetrics.totalScans + 1}`));
    console.log(chalk.gray('─'.repeat(50)));

    try {
      // 1. Market Intelligence Phase
      const scores = await this.scanPools();
      
      // Agent decides if market conditions warrant action
      const marketDecision = this.decisionEngine.evaluateMarketOpportunity(scores);
      if (marketDecision.shouldAlert) {
        console.log(chalk.cyan(`\n   📢 Agent Alert: ${marketDecision.message}`));
      }

      // 2. Portfolio Management Phase
      const positions = await this.monitorPositions();
      
      if (positions.length > 0) {
        console.log(chalk.blue(`\n   📊 Managing ${positions.length} positions`));

        // 3. Autonomous Action Phase
        const needAction = positions.filter(p => p.rebalanceNeeded || p.health !== 'healthy');
        if (needAction.length > 0) {
          console.log(chalk.yellow(`\n   ⚠️ ${needAction.length} positions require attention`));
          
          for (const pos of needAction) {
            await this.evaluateAndRebalance(pos.position.poolAddress, true);
          }
        }

        // Update fee metrics
        const totalFees = positions.reduce((sum, p) => sum + p.totalFeesUsd, 0);
        this.performanceMetrics.feesEarned = totalFees;
      }

      // 4. Self-Reflection Phase
      if (this.performanceMetrics.totalScans % 5 === 0) {
        const reflection = this.decisionEngine.generateReflection(this.performanceMetrics);
        console.log(chalk.magenta(`\n   🧠 Agent Reflection: ${reflection}`));
      }

      console.log(chalk.green(`\n   ✅ Cycle complete. Next: ${this.config.scanIntervalMinutes} min`));
      console.log(chalk.gray(`   Runtime: ${((Date.now() - this.performanceMetrics.startTime) / 3600000).toFixed(1)}h | ` +
        `Scans: ${this.performanceMetrics.totalScans} | Rebalances: ${this.performanceMetrics.rebalancesExecuted}`));

    } catch (error) {
      console.error(chalk.red('\n   ❌ Cycle error:'), (error as Error).message);
      await this.reporter.reportError('cycle_error', (error as Error).message);
    }
  }

  // Human-readable status
  async getAgentStatus(): Promise<string> {
    const runtime = Date.now() - this.performanceMetrics.startTime;
    const hours = (runtime / 3600000).toFixed(1);
    
    return `
🤖 Agent: ${this.personality.name}
⏱️  Runtime: ${hours} hours
📊 Scans: ${this.performanceMetrics.totalScans}
🎯 Opportunities: ${this.performanceMetrics.opportunitiesFound}
🔄 Rebalances: ${this.performanceMetrics.rebalancesExecuted}
💰 Fees Earned: $${this.performanceMetrics.feesEarned.toFixed(4)}
🧠 Personality: ${this.personality.description}
    `;
  }

  getScanHistory(): ScanResult[] {
    return this.scanHistory;
  }

  getPerformanceMetrics() {
    return this.performanceMetrics;
  }
}
