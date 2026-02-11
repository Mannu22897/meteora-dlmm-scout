import { PoolScore, PerformanceMetrics } from './types.js';
import fs from 'fs';
import path from 'path';

/**
 * SelfReporter - Agent's Communication System
 * 
 * Allows the agent to:
 * - Report opportunities without being asked
 * - Log actions it takes
 * - Generate periodic reports
 * - Communicate errors
 */
export class SelfReporter {
  private walletAddress: string;
  private reportDir: string;
  private actionLog: Array<{
    timestamp: Date;
    type: string;
    details: string;
    value?: number;
  }> = [];

  constructor(walletAddress: string) {
    this.walletAddress = walletAddress;
    this.reportDir = path.join(process.cwd(), 'reports');
    
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  /**
   * Reports a high-value opportunity (called automatically by agent)
   */
  async reportOpportunity(opportunity: PoolScore): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      type: 'OPPORTUNITY',
      pool: opportunity.poolAddress,
      score: opportunity.totalScore,
      apy: opportunity.estimatedApy,
      risk: opportunity.ilRisk,
      recommendation: opportunity.recommendation,
    };

    this.actionLog.push({
      timestamp: new Date(),
      type: 'opportunity_found',
      details: `Found ${opportunity.estimatedApy.toFixed(1)}% APY opportunity`,
      value: opportunity.totalScore,
    });

    console.log(`\n📢 [AGENT REPORT] High-value opportunity detected!`);
    console.log(`   Pool: ${opportunity.poolAddress.slice(0, 20)}...`);
    console.log(`   APY: ${opportunity.estimatedApy.toFixed(1)}%`);
    console.log(`   Score: ${opportunity.totalScore.toFixed(0)}/100`);
    console.log(`   Risk: ${opportunity.ilRisk}% IL`);
    
    this.saveReport(report);
  }

  /**
   * Reports an action the agent took
   */
  async reportAction(action: string, target: string, txSignature?: string): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      type: 'ACTION',
      action,
      target,
      txSignature,
      wallet: this.walletAddress,
    };

    this.actionLog.push({
      timestamp: new Date(),
      type: action,
      details: `${action} on ${target}`,
    });

    console.log(`\n📝 [AGENT ACTION] ${action.toUpperCase()}`);
    console.log(`   Target: ${target}`);
    if (txSignature) {
      console.log(`   TX: ${txSignature.slice(0, 30)}...`);
    }
    
    this.saveReport(report);
  }

  /**
   * Reports errors for later analysis
   */
  async reportError(errorType: string, message: string): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      type: 'ERROR',
      errorType,
      message,
      wallet: this.walletAddress,
    };

    this.actionLog.push({
      timestamp: new Date(),
      type: 'error',
      details: `${errorType}: ${message}`,
    });

    console.log(`\n⚠️  [AGENT ERROR] ${errorType}`);
    console.log(`   ${message}`);
    
    this.saveReport(report);
  }

  /**
   * Generates a comprehensive session report
   */
  generateSessionReport(metrics: PerformanceMetrics): string {
    const report = {
      timestamp: new Date().toISOString(),
      type: 'SESSION_SUMMARY',
      wallet: this.walletAddress,
      runtime: (Date.now() - metrics.startTime) / 1000, // seconds
      metrics: {
        totalScans: metrics.totalScans,
        opportunitiesFound: metrics.opportunitiesFound,
        rebalancesExecuted: metrics.rebalancesExecuted,
        feesEarned: metrics.feesEarned,
      },
      actionLog: this.actionLog,
    };

    const filename = `session_${Date.now()}.json`;
    const filepath = path.join(this.reportDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));

    const runtimeHours = ((Date.now() - metrics.startTime) / 3600000).toFixed(1);
    const summary = `
╔══════════════════════════════════════════════════════════╗
║              📊 AGENT SESSION REPORT                     ║
╚══════════════════════════════════════════════════════════╝
Runtime: ${runtimeHours} hours
Scans: ${metrics.totalScans}
Opportunities: ${metrics.opportunitiesFound}
Rebalances: ${metrics.rebalancesExecuted}
Fees Earned: $${metrics.feesEarned.toFixed(4)}
Actions Logged: ${this.actionLog.length}

Report saved: ${filepath}
    `;

    console.log(summary);
    return summary;
  }

  /**
   * Generates a formatted report for sharing
   */
  generateShareableReport(metrics: PerformanceMetrics): string {
    const runtime = (Date.now() - metrics.startTime) / 3600000;
    
    return `
🤖 Meteora DLMM Scout Agent - Performance Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️  Runtime: ${runtime.toFixed(1)} hours
🔍 Scans: ${metrics.totalScans}
🎯 Opportunities: ${metrics.opportunitiesFound}
🔄 Rebalances: ${metrics.rebalancesExecuted}
💰 Fees: $${metrics.feesEarned.toFixed(4)}

Key Actions:
${this.actionLog.slice(-5).map(a => `• ${a.timestamp.toISOString().slice(11, 19)}: ${a.type}`).join('\n')}

Wallet: ${this.walletAddress.slice(0, 16)}...
    `.trim();
  }

  private saveReport(report: object): void {
    const filename = `report_${Date.now()}.json`;
    const filepath = path.join(this.reportDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  }

  getActionLog() {
    return this.actionLog;
  }
}
