import { AgentConfig, AgentPersonality, PoolScore, PositionStatus, PerformanceMetrics, MarketObservation, RebalanceDecision } from './types.js';

/**
 * DecisionEngine - The "Brain" of the Agent
 * 
 * This module gives the agent autonomous decision-making capabilities.
 * It analyzes market conditions, evaluates positions, and decides on actions
 * without human intervention.
 */
export class DecisionEngine {
  private config: AgentConfig;
  private personality: AgentPersonality;
  private lastMarketState: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  private consecutiveGoodScans = 0;

  constructor(config: AgentConfig, personality: AgentPersonality) {
    this.config = config;
    this.personality = personality;
  }

  /**
   * Analyzes overall market conditions from pool data
   */
  analyzeMarketConditions(scores: PoolScore[]): MarketObservation {
    const avgScore = scores.reduce((sum, s) => sum + s.totalScore, 0) / scores.length;
    const highYieldPools = scores.filter(s => s.estimatedApy > 50).length;
    const avgIlRisk = scores.reduce((sum, s) => sum + s.ilRisk, 0) / scores.length;

    let summary: string;
    let sentiment: 'bullish' | 'bearish' | 'neutral';

    if (avgScore > 70 && highYieldPools >= 2) {
      sentiment = 'bullish';
      summary = `Market is hot! ${highYieldPools} high-yield opportunities detected.`;
      this.consecutiveGoodScans++;
    } else if (avgScore < 40 || avgIlRisk > 8) {
      sentiment = 'bearish';
      summary = 'Market conditions are risky. Being cautious.';
      this.consecutiveGoodScans = 0;
    } else {
      sentiment = 'neutral';
      summary = 'Market is stable. Monitoring for opportunities.';
      this.consecutiveGoodScans = Math.max(0, this.consecutiveGoodScans - 1);
    }

    this.lastMarketState = sentiment;

    return {
      sentiment,
      summary,
      avgScore,
      highYieldPools,
      avgIlRisk,
      recommendation: this.generateMarketRecommendation(sentiment),
    };
  }

  private generateMarketRecommendation(sentiment: string): string {
    const recommendations: Record<string, string> = {
      bullish: 'Consider increasing position sizes',
      bearish: 'Reduce exposure, wait for better conditions',
      neutral: 'Maintain current strategy',
    };
    return recommendations[sentiment] || 'Hold and observe';
  }

  /**
   * Evaluates if market conditions warrant an alert to the user
   */
  evaluateMarketOpportunity(scores: PoolScore[]): { shouldAlert: boolean; message: string } {
    const topScore = scores[0];
    
    if (!topScore) {
      return { shouldAlert: false, message: '' };
    }

    // Alert on exceptional opportunities
    if (topScore.totalScore > 85 && topScore.estimatedApy > 100) {
      return {
        shouldAlert: true,
        message: `Exceptional opportunity! ${topScore.estimatedApy.toFixed(0)}% APY pool found with ${topScore.totalScore.toFixed(0)}/100 score`,
      };
    }

    // Alert on market shifts
    if (this.consecutiveGoodScans >= 3) {
      return {
        shouldAlert: true,
        message: 'Sustained favorable market conditions detected. Good time to deploy capital.',
      };
    }

    return { shouldAlert: false, message: '' };
  }

  /**
   * Analyzes position health and determines if action is needed
   */
  analyzePositionHealth(status: PositionStatus): { requiresAttention: boolean; reason: string } {
    if (status.health === 'critical') {
      return { requiresAttention: true, reason: 'Position is in critical state' };
    }

    if (!status.position.isInRange) {
      return { requiresAttention: true, reason: 'Position is out of range and not earning fees' };
    }

    if (status.rebalanceNeeded) {
      return { requiresAttention: true, reason: 'Price has moved significantly from entry' };
    }

    if (status.position.ilPercent > this.config.maxIlRiskPercent) {
      return { requiresAttention: true, reason: 'Impermanent loss exceeding threshold' };
    }

    return { requiresAttention: false, reason: 'Position is healthy' };
  }

  /**
   * Makes the final rebalance decision using the agent's "personality"
   */
  makeRebalanceDecision(
    status: PositionStatus,
    personality: AgentPersonality
  ): RebalanceDecision {
    const health = this.analyzePositionHealth(status);
    
    if (!health.requiresAttention) {
      return {
        shouldRebalance: false,
        shouldAct: false,
        action: 'hold',
        reason: 'Position is healthy',
        reasoning: 'Position is performing well within acceptable parameters',
        confidence: 95,
      };
    }

    // Calculate confidence based on how far out of range
    let confidence = 70;
    if (!status.position.isInRange) {
      confidence += 20; // High confidence to rebalance when out of range
    }
    if (status.health === 'critical') {
      confidence += 10;
    }

    // Apply personality modifier
    if (personality.riskTolerance > 0.7) {
      confidence = Math.min(99, confidence + 10); // Aggressive agents act more confidently
    } else if (personality.riskTolerance < 0.4) {
      confidence = Math.max(50, confidence - 15); // Conservative agents are more cautious
    }

    // Determine if we should auto-execute
    const shouldAct = confidence >= 75;

    if (!shouldAct) {
      return {
        shouldRebalance: false,
        shouldAct: false,
        action: 'monitor',
        reason: health.reason,
        reasoning: `Conditions detected (${health.reason}) but confidence (${confidence}%) below auto-execution threshold`,
        confidence,
      };
    }

    // Calculate new range based on current market
    const currentBin = status.position.lowerBin + 
      (status.position.upperBin - status.position.lowerBin) / 2;
    const rangeWidth = personality.riskTolerance > 0.7 ? 30 : 40; // Wider range for conservative

    return {
      shouldRebalance: true,
      shouldAct: true,
      action: 'rebalance',
      reason: health.reason,
      reasoning: `${health.reason}. Agent confidence: ${confidence}%. Rebalancing to capture fees.`,
      confidence,
      suggestedRange: {
        lowerBin: Math.floor(currentBin - rangeWidth / 2),
        upperBin: Math.floor(currentBin + rangeWidth / 2),
      },
    };
  }

  /**
   * Generates periodic self-reflection on performance
   */
  generateReflection(metrics: PerformanceMetrics): string {
    const runtime = (Date.now() - metrics.startTime) / 3600000; // hours
    const scansPerHour = runtime > 0 ? metrics.totalScans / runtime : 0;
    const avgOpportunities = metrics.totalScans > 0 ? metrics.opportunitiesFound / metrics.totalScans : 0;

    if (scansPerHour < 0.5) {
      return "Scanning infrequently. May miss short-lived opportunities.";
    }

    if (avgOpportunities > 2) {
      return "Finding many opportunities. Market is favorable.";
    }

    if (avgOpportunities < 0.5) {
      return "Few opportunities lately. May need to lower standards or wait.";
    }

    if (metrics.rebalancesExecuted > 5) {
      return "Active rebalancing paying off. Fees accumulating nicely.";
    }

    return "Steady performance. Continuing to monitor.";
  }

  /**
   * Adjusts strategy based on recent performance
   */
  adaptStrategy(metrics: PerformanceMetrics): Partial<AgentConfig> {
    const runtime = (Date.now() - metrics.startTime) / 3600000;
    
    // If running for a while with low success, become more aggressive
    if (runtime > 24 && metrics.opportunitiesFound < 5) {
      return {
        minApyThreshold: Math.max(5, this.config.minApyThreshold - 5),
      };
    }

    // If many rebalances but low fees, widen ranges
    if (metrics.rebalancesExecuted > 10 && metrics.feesEarned < 1) {
      return {
        defaultBinRange: this.config.defaultBinRange + 10,
      };
    }

    return {};
  }
}
