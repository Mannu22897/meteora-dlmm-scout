import 'dotenv/config';
import { AgentConfig } from './types.js';

export function loadConfig(): AgentConfig {
  return {
    rpcUrl: process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
    walletPrivateKey: process.env.WALLET_PRIVATE_KEY || '',
    scanIntervalMinutes: parseInt(process.env.SCAN_INTERVAL_MINUTES || '30'),
    minApyThreshold: parseFloat(process.env.MIN_APY_THRESHOLD || '15'),
    maxIlRiskPercent: parseFloat(process.env.MAX_IL_RISK_PERCENT || '5'),
    autoRebalance: process.env.AUTO_REBALANCE === 'true',
    riskLevel: (process.env.RISK_LEVEL as 'low' | 'medium' | 'high') || 'medium',
    defaultBinRange: parseInt(process.env.DEFAULT_BIN_RANGE || '40'),
    rebalanceTriggerPercent: parseFloat(process.env.REBALANCE_TRIGGER_PERCENT || '10'),
    minPositionUsd: parseFloat(process.env.MIN_POSITION_USD || '50'),
    demoMode: process.env.DEMO_MODE === 'true',
  };
}

export function getRiskMultiplier(level: string): number {
  const multipliers = {
    low: 0.5,
    medium: 1.0,
    high: 1.5,
  };
  return multipliers[level as keyof typeof multipliers] || 1.0;
}

export function validateConfig(config: AgentConfig): string[] {
  const errors: string[] = [];
  
  if (!config.walletPrivateKey && !config.demoMode) {
    errors.push('WALLET_PRIVATE_KEY is required (or use DEMO_MODE=true)');
  }
  
  if (config.minApyThreshold < 0 || config.minApyThreshold > 1000) {
    errors.push('MIN_APY_THRESHOLD must be between 0 and 1000');
  }
  
  if (config.maxIlRiskPercent < 0 || config.maxIlRiskPercent > 50) {
    errors.push('MAX_IL_RISK_PERCENT must be between 0 and 50');
  }
  
  return errors;
}
