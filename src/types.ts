export interface AgentConfig {
  rpcUrl: string;
  walletPrivateKey: string;
  scanIntervalMinutes: number;
  minApyThreshold: number;
  maxIlRiskPercent: number;
  autoRebalance: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  defaultBinRange: number;
  rebalanceTriggerPercent: number;
  minPositionUsd: number;
  demoMode: boolean;
}

export interface PoolData {
  address: string;
  tokenX: TokenInfo;
  tokenY: TokenInfo;
  activeBin: number;
  activePrice: number;
  tvl: number;
  volume24h: number;
  fees24h: number;
  binStep: number;
  baseFee: number;
}

export interface TokenInfo {
  mint: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
}

export interface PoolScore {
  poolAddress: string;
  totalScore: number;
  yieldScore: number;
  volumeScore: number;
  stabilityScore: number;
  tvlScore: number;
  estimatedApy: number;
  ilRisk: number;
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'avoid';
}

export interface PositionData {
  address: string;
  poolAddress: string;
  lowerBin: number;
  upperBin: number;
  totalXAmount: number;
  totalYAmount: number;
  feeX: number;
  feeY: number;
  isInRange: boolean;
  entryPrice: number;
  currentPrice: number;
  ilPercent: number;
}

export interface PositionStatus {
  position: PositionData;
  health: 'healthy' | 'warning' | 'critical';
  timeInRange: number;
  totalFeesUsd: number;
  pnlUsd: number;
  rebalanceNeeded: boolean;
}

export interface ScanResult {
  timestamp: Date;
  poolsScanned: number;
  opportunities: PoolScore[];
  topPick: PoolScore | null;
}

export interface RebalanceDecision {
  shouldRebalance: boolean;
  shouldAct: boolean;
  action: 'hold' | 'rebalance' | 'close' | 'monitor';
  reason: string;
  reasoning: string;
  confidence: number;
  suggestedRange?: {
    lowerBin: number;
    upperBin: number;
  };
}

export interface AgentPersonality {
  name: string;
  riskTolerance: number;
  rebalanceThreshold: number;
  description: string;
  quote: string;
}

export interface MarketObservation {
  sentiment: 'bullish' | 'bearish' | 'neutral';
  summary: string;
  avgScore: number;
  highYieldPools: number;
  avgIlRisk: number;
  recommendation: string;
}

export interface PerformanceMetrics {
  totalScans: number;
  opportunitiesFound: number;
  rebalancesExecuted: number;
  feesEarned: number;
  startTime: number;
}

export interface ScanResult {
  timestamp: Date;
  poolsScanned: number;
  opportunities: PoolScore[];
  topPick: PoolScore | null;
  marketConditions?: MarketObservation;
}
