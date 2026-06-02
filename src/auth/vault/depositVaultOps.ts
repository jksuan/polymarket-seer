import type { DepositWalletCall, RelayClient } from "@polymarket/builder-relayer-client";
import type { ethers } from "ethers";

import type { RelayTransaction } from "@/auth/collateralBalance";
import {
  buildErc1155ApprovalRelayBatchForOperators,
  buildPusdApprovalRelayBatchForSpenders,
  buildTradingApprovalRelayBatch,
  findMissingErc1155Operators,
  findMissingPusdAllowances,
  TRADING_APPROVAL_SPENDERS,
  TRADING_ERC1155_OPERATORS,
} from "@/auth/collateralBalance";

const DEPOSIT_BATCH_DEADLINE_SEC = 600;
/** 单批 Deposit Wallet 调用上限，避免 relayer 大批次部分失败 */
const DEPOSIT_WALLET_BATCH_CHUNK_SIZE = 4;

export function relayTransactionsToDepositCalls(
  transactions: RelayTransaction[]
): DepositWalletCall[] {
  return transactions.map((tx) => ({
    target: tx.to,
    value: tx.value,
    data: tx.data,
  }));
}

export function depositWalletDeadline(): string {
  return Math.floor(Date.now() / 1000 + DEPOSIT_BATCH_DEADLINE_SEC).toString();
}

/** 通过 Deposit Wallet batch 执行 relayer 交易 */
export async function executeDepositWalletRelayBatch(
  relayClient: RelayClient,
  walletAddress: string,
  transactions: RelayTransaction[],
  _label?: string
): Promise<void> {
  if (transactions.length === 0) return;

  const calls = relayTransactionsToDepositCalls(transactions);
  const response = await relayClient.executeDepositWalletBatch(
    calls,
    walletAddress,
    depositWalletDeadline()
  );
  await response.wait();
}

/** 分块执行，每块单独签名，降低大批次失败概率 */
export async function executeDepositWalletRelayBatchInChunks(
  relayClient: RelayClient,
  walletAddress: string,
  transactions: RelayTransaction[],
  chunkSize = DEPOSIT_WALLET_BATCH_CHUNK_SIZE
): Promise<void> {
  for (let i = 0; i < transactions.length; i += chunkSize) {
    const chunk = transactions.slice(i, i + chunkSize);
    await executeDepositWalletRelayBatch(relayClient, walletAddress, chunk);
  }
}

/** 确保 Deposit Wallet 已部署；返回部署前是否已存在 */
export async function ensureDepositVaultDeployed(
  relayClient: RelayClient,
  walletAddress: string
): Promise<boolean> {
  const isDeployed = await relayClient.getDeployed(walletAddress, "WALLET");
  if (isDeployed) {
    return true;
  }

  const deployTx = await relayClient.deployDepositWallet();
  await deployTx.wait();
  return false;
}

/**
 * 确保 pUSD 交易授权到位（仅补缺失 spender，减少签名次数）。
 * 分块提交并在链上校验，失败则抛错。
 */
export async function ensureDepositTradingApprovals(
  relayClient: RelayClient,
  walletAddress: string,
  provider: ethers.providers.Provider,
  /** 优先保证的 spender（如 Neg Risk Exchange V2） */
  prioritySpenders: readonly string[] = []
): Promise<void> {
  const priority = [...new Set(prioritySpenders.filter(Boolean))];
  if (priority.length > 0) {
    const missingPriority = await findMissingPusdAllowances(
      provider,
      walletAddress,
      priority
    );
    if (missingPriority.length > 0) {
      await executeDepositWalletRelayBatchInChunks(
        relayClient,
        walletAddress,
        buildPusdApprovalRelayBatchForSpenders(missingPriority)
      );
    }
  }

  let missing = await findMissingPusdAllowances(
    provider,
    walletAddress,
    TRADING_APPROVAL_SPENDERS
  );
  if (missing.length > 0) {
    await executeDepositWalletRelayBatchInChunks(
      relayClient,
      walletAddress,
      buildPusdApprovalRelayBatchForSpenders(missing)
    );
    missing = await findMissingPusdAllowances(provider, walletAddress, TRADING_APPROVAL_SPENDERS);
  }

  if (missing.length > 0) {
    throw new Error(
      `pUSD 授权未完成（缺少 ${missing.length} 个 spender，含 Exchange V2）。请完成全部签名后重试。`
    );
  }
}

/**
 * 确保 CTF outcome token (ERC1155) 已对 Exchange 授权（卖出必需）。
 * 优先补当前市场所需 operator，再扫全量 TRADING_ERC1155_OPERATORS。
 */
export async function ensureDepositErc1155Approvals(
  relayClient: RelayClient,
  walletAddress: string,
  provider: ethers.providers.Provider,
  priorityOperators: readonly string[] = []
): Promise<void> {
  const priority = [...new Set(priorityOperators.filter(Boolean))];
  if (priority.length > 0) {
    const missingPriority = await findMissingErc1155Operators(
      provider,
      walletAddress,
      priority
    );
    if (missingPriority.length > 0) {
      await executeDepositWalletRelayBatchInChunks(
        relayClient,
        walletAddress,
        buildErc1155ApprovalRelayBatchForOperators(missingPriority)
      );
    }
  }

  let missing = await findMissingErc1155Operators(
    provider,
    walletAddress,
    TRADING_ERC1155_OPERATORS
  );
  if (missing.length > 0) {
    await executeDepositWalletRelayBatchInChunks(
      relayClient,
      walletAddress,
      buildErc1155ApprovalRelayBatchForOperators(missing)
    );
    missing = await findMissingErc1155Operators(
      provider,
      walletAddress,
      TRADING_ERC1155_OPERATORS
    );
  }

  if (missing.length > 0) {
    throw new Error(
      `Outcome 代币授权未完成（缺少 ${missing.length} 个 Exchange operator）。请完成全部签名后重试。`
    );
  }
}

/** @deprecated 请使用 ensureDepositTradingApprovals */
export async function executeDepositTradingApprovalBatch(
  relayClient: RelayClient,
  walletAddress: string
): Promise<void> {
  await executeDepositWalletRelayBatchInChunks(
    relayClient,
    walletAddress,
    buildTradingApprovalRelayBatch()
  );
}
