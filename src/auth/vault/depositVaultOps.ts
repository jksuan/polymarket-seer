import type { DepositWalletCall, RelayClient } from "@polymarket/builder-relayer-client";
import type { ethers } from "ethers";

import type { RelayTransaction } from "@/auth/collateralBalance";
import {
  buildErc1155ApprovalRelayBatchForOperators,
  buildPusdApprovalRelayBatchForSpenders,
  buildTradingApprovalRelayBatch,
  findMissingErc1155Operators,
  findMissingPusdAllowances,
  getRequiredErc1155OperatorsForMarket,
  getRequiredPusdSpendersForMarket,
  TRADING_APPROVAL_SPENDERS,
  TRADING_ERC1155_OPERATORS,
} from "@/auth/collateralBalance";

const DEPOSIT_BATCH_DEADLINE_SEC = 600;
/** 单批 Deposit Wallet 调用上限，避免 relayer 大批次部分失败 */
const DEPOSIT_WALLET_BATCH_CHUNK_SIZE = 4;

/** 普市 1 / Neg Risk 2 笔 approve 可一次 WALLET batch 签完 */
export const MARKET_MINIMAL_SINGLE_BATCH_MAX = 3;

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

/**
 * 小批次单次签名；大批次再分块（赎回等路径仍用分块）。
 */
export async function executeDepositWalletRelayBatches(
  relayClient: RelayClient,
  walletAddress: string,
  transactions: RelayTransaction[],
  chunkSize = DEPOSIT_WALLET_BATCH_CHUNK_SIZE
): Promise<void> {
  if (transactions.length === 0) return;
  if (transactions.length <= MARKET_MINIMAL_SINGLE_BATCH_MAX) {
    await executeDepositWalletRelayBatch(relayClient, walletAddress, transactions);
    return;
  }
  await executeDepositWalletRelayBatchInChunks(relayClient, walletAddress, transactions, chunkSize);
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
 * 仅补当前市场类型所需的 pUSD spender（买入路径，单次 WALLET batch 签名）。
 */
export async function ensureDepositTradingApprovalsForMarket(
  relayClient: RelayClient,
  walletAddress: string,
  provider: ethers.providers.Provider,
  negRisk: boolean
): Promise<void> {
  const spenders = getRequiredPusdSpendersForMarket(negRisk);
  let missing = await findMissingPusdAllowances(provider, walletAddress, spenders);
  if (missing.length > 0) {
    await executeDepositWalletRelayBatches(
      relayClient,
      walletAddress,
      buildPusdApprovalRelayBatchForSpenders(missing)
    );
    missing = await findMissingPusdAllowances(provider, walletAddress, spenders);
  }

  if (missing.length > 0) {
    throw new Error(
      `pUSD 授权未完成（缺少 ${missing.length} 个本市场 spender）。请完成授权签名后重试。`
    );
  }
}

/**
 * 仅补当前市场类型所需的 ERC1155 operator（卖出路径）。
 */
export async function ensureDepositErc1155ApprovalsForMarket(
  relayClient: RelayClient,
  walletAddress: string,
  provider: ethers.providers.Provider,
  negRisk: boolean
): Promise<void> {
  const operators = getRequiredErc1155OperatorsForMarket(negRisk);
  let missing = await findMissingErc1155Operators(provider, walletAddress, operators);
  if (missing.length > 0) {
    await executeDepositWalletRelayBatches(
      relayClient,
      walletAddress,
      buildErc1155ApprovalRelayBatchForOperators(missing)
    );
    missing = await findMissingErc1155Operators(provider, walletAddress, operators);
  }

  if (missing.length > 0) {
    throw new Error(
      `Outcome 代币授权未完成（缺少 ${missing.length} 个本市场 operator）。请完成授权签名后重试。`
    );
  }
}

/**
 * 确保 pUSD 交易授权到位（全量 spender，赎回/兼容路径）。
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
      await executeDepositWalletRelayBatches(
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
    await executeDepositWalletRelayBatches(
      relayClient,
      walletAddress,
      buildPusdApprovalRelayBatchForSpenders(missing)
    );
    missing = await findMissingPusdAllowances(provider, walletAddress, TRADING_APPROVAL_SPENDERS);
  }

  if (missing.length > 0) {
    throw new Error(
      `pUSD 授权未完成（缺少 ${missing.length} 个 spender，含 Exchange V2）。请完成授权签名后重试。`
    );
  }
}

/**
 * 确保 CTF outcome token (ERC1155) 已对 Exchange 授权（全量 operator，兼容路径）。
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
      await executeDepositWalletRelayBatches(
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
    await executeDepositWalletRelayBatches(
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
      `Outcome 代币授权未完成（缺少 ${missing.length} 个 Exchange operator）。请完成授权签名后重试。`
    );
  }
}

/** @deprecated 请使用 ensureDepositTradingApprovals */
export async function executeDepositTradingApprovalBatch(
  relayClient: RelayClient,
  walletAddress: string
): Promise<void> {
  await executeDepositWalletRelayBatches(
    relayClient,
    walletAddress,
    buildTradingApprovalRelayBatch()
  );
}
