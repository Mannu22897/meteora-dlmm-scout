import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import DLMM, { StrategyType } from '@meteora-ag/dlmm';
import { BN } from 'bn.js';
import { PositionData, PositionStatus, RebalanceDecision, AgentConfig } from './types.js';

export class PositionExecutor {
  private connection: Connection;
  private wallet: Keypair;
  private config: AgentConfig;

  constructor(connection: Connection, wallet: Keypair, config: AgentConfig) {
    this.connection = connection;
    this.wallet = wallet;
    this.config = config;
  }

  async monitorPosition(poolAddress: string, positionAddress?: string): Promise<PositionStatus[]> {
    const statuses: PositionStatus[] = [];
    
    try {
      const poolPubKey = new PublicKey(poolAddress);
      // @ts-ignore - DLMM.create exists at runtime
      const dlmmPool = await DLMM.create(this.connection, poolPubKey);
      const activeBin = await dlmmPool.getActiveBin();
      
      let positions: { publicKey: PublicKey; positionData: any }[] = [];
      
      if (positionAddress) {
        // Monitor specific position
        const posPubKey = new PublicKey(positionAddress);
        const position = await dlmmPool.getPosition(posPubKey);
        positions = [{ publicKey: posPubKey, positionData: position.positionData }];
      } else {
        // Monitor all positions for this wallet
        const { userPositions } = await dlmmPool.getPositionsByUserAndLbPair(this.wallet.publicKey);
        positions = userPositions;
      }

      for (const pos of positions) {
        const lowerBin = pos.positionData.lowerBinId;
        const upperBin = pos.positionData.upperBinId;
        const isInRange = activeBin.binId >= lowerBin && activeBin.binId <= upperBin;
        
        const feeX = new BN(pos.positionData.feeX.toString());
        const feeY = new BN(pos.positionData.feeY.toString());
        const totalX = new BN(pos.positionData.totalXAmount.toString());
        const totalY = new BN(pos.positionData.totalYAmount.toString());

        const posData: PositionData = {
          address: pos.publicKey.toBase58(),
          poolAddress,
          lowerBin,
          upperBin,
          totalXAmount: Number(totalX) / 1e9,
          totalYAmount: Number(totalY) / 1e6,
          feeX: Number(feeX) / 1e9,
          feeY: Number(feeY) / 1e6,
          isInRange,
          entryPrice: parseFloat(activeBin.price),
          currentPrice: parseFloat(activeBin.price),
          ilPercent: 0,
        };

        // Calculate total fees in USD (approximate)
        const solPrice = parseFloat(activeBin.price);
        const totalFeesUsd = (posData.feeX * solPrice) + posData.feeY;

        // Determine health status
        let health: PositionStatus['health'] = 'healthy';
        if (!isInRange) health = 'critical';
        else if (totalFeesUsd < 0.1) health = 'warning';

        // Determine if rebalance is needed
        const rebalanceNeeded = !isInRange || this.shouldRebalance(posData, activeBin.binId);

        statuses.push({
          position: posData,
          health,
          timeInRange: isInRange ? 3600 : 0,
          totalFeesUsd,
          pnlUsd: totalFeesUsd,
          rebalanceNeeded,
        });
      }
    } catch (error) {
      console.error(`Error monitoring position: ${error}`);
    }

    return statuses;
  }

  async evaluateRebalance(poolAddress: string, positionData: PositionData): Promise<RebalanceDecision> {
    const poolPubKey = new PublicKey(poolAddress);
    // @ts-ignore - DLMM.create exists at runtime
    const dlmmPool = await DLMM.create(this.connection, poolPubKey);
    const activeBin = await dlmmPool.getActiveBin();

    const currentCenter = Math.floor((positionData.lowerBin + positionData.upperBin) / 2);
    const distanceFromCenter = Math.abs(activeBin.binId - currentCenter);
    const rangeSize = positionData.upperBin - positionData.lowerBin;
    const percentOutOfRange = (distanceFromCenter / (rangeSize / 2)) * 100;

    if (!positionData.isInRange) {
      return {
        shouldRebalance: true,
        shouldAct: true,
        action: 'rebalance',
        reason: `Position is out of range. Active bin ${activeBin.binId} is outside [${positionData.lowerBin}, ${positionData.upperBin}]`,
        reasoning: 'Price moved outside position range. Immediate rebalance needed to resume fee generation.',
        confidence: 95,
        suggestedRange: {
          lowerBin: activeBin.binId - Math.floor(this.config.defaultBinRange / 2),
          upperBin: activeBin.binId + Math.floor(this.config.defaultBinRange / 2),
        },
      };
    }

    if (percentOutOfRange > this.config.rebalanceTriggerPercent) {
      return {
        shouldRebalance: true,
        shouldAct: true,
        action: 'rebalance',
        reason: `Price has moved ${percentOutOfRange.toFixed(1)}% from position center`,
        reasoning: 'Price drift detected. Rebalancing will optimize fee capture.',
        confidence: 75,
        suggestedRange: {
          lowerBin: activeBin.binId - Math.floor(this.config.defaultBinRange / 2),
          upperBin: activeBin.binId + Math.floor(this.config.defaultBinRange / 2),
        },
      };
    }

    return {
      shouldRebalance: false,
      shouldAct: false,
      action: 'hold',
      reason: `Position is healthy. Price within acceptable range.`,
      reasoning: 'Position is well-positioned and earning fees. No action required.',
      confidence: 90,
    };
  }

  async executeRebalance(
    poolAddress: string,
    positionAddress: string,
    newRange: { lowerBin: number; upperBin: number }
  ): Promise<string[]> {
    if (this.config.demoMode) {
      console.log('🎮 DEMO MODE: Simulating rebalance...');
      await new Promise(r => setTimeout(r, 2000));
      return ['demo_tx_signature_' + Math.random().toString(36).substring(7)];
    }

    const signatures: string[] = [];
    
    try {
      const poolPubKey = new PublicKey(poolAddress);
      const posPubKey = new PublicKey(positionAddress);
      // @ts-ignore - DLMM.create exists at runtime
      const dlmmPool = await DLMM.create(this.connection, poolPubKey);

      // Step 1: Remove liquidity from existing position
      console.log('🔄 Removing liquidity from existing position...');
      const removeTx = await dlmmPool.removeLiquidity({
        user: this.wallet.publicKey,
        position: posPubKey,
        fromBinId: 0,
        toBinId: 100,
        bps: new BN(10000),
        shouldClaimAndClose: true,
      });

      const removeTxns = Array.isArray(removeTx) ? removeTx : [removeTx];
      for (const txn of removeTxns) {
        txn.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
        txn.feePayer = this.wallet.publicKey;
        txn.sign(this.wallet);
        const sig = await this.connection.sendRawTransaction(txn.serialize());
        signatures.push(sig);
        await this.connection.confirmTransaction(sig, 'confirmed');
      }
      console.log('✅ Liquidity removed');

      // Step 2: Create new position with updated range
      await new Promise(r => setTimeout(r, 2000));
      
      const solBal = await this.connection.getBalance(this.wallet.publicKey);
      const keepForGas = 0.07 * 1e9;
      const depositSol = Math.max(0, solBal - keepForGas);

      if (depositSol <= 0) {
        throw new Error('Insufficient SOL for new position');
      }

      console.log('🔄 Creating new position...');
      const newPos = Keypair.generate();
      const depositTx = await dlmmPool.initializePositionAndAddLiquidityByStrategy({
        positionPubKey: newPos.publicKey,
        user: this.wallet.publicKey,
        totalXAmount: new BN(Math.floor(depositSol)),
        totalYAmount: new BN(0),
        strategy: {
          maxBinId: newRange.upperBin,
          minBinId: newRange.lowerBin,
          strategyType: StrategyType.Curve,
        },
      });

      const txn = (depositTx as any).transaction || depositTx;
      txn.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
      txn.feePayer = this.wallet.publicKey;
      const signers = [(depositTx as any).signers || []].flat();
      txn.sign(this.wallet, newPos, ...signers);
      const sig = await this.connection.sendRawTransaction(txn.serialize());
      signatures.push(sig);
      await this.connection.confirmTransaction(sig, 'confirmed');

      console.log(`✅ Rebalance complete! New position: ${newPos.publicKey.toBase58()}`);
    } catch (error) {
      console.error('Rebalance failed:', error);
      throw error;
    }

    return signatures;
  }

  private shouldRebalance(position: PositionData, activeBin: number): boolean {
    const center = Math.floor((position.lowerBin + position.upperBin) / 2);
    const distance = Math.abs(activeBin - center);
    const range = position.upperBin - position.lowerBin;
    return (distance / range) > (this.config.rebalanceTriggerPercent / 100);
  }
}
