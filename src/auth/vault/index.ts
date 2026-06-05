export type { TradingVaultContext, TradingVaultKind } from "./types";
export { resolveTradingVault } from "./resolveTradingVault";
export { createTradingRelayClient } from "./relayClientFactory";
export {
  ensureDepositVaultDeployed,
  ensureDepositTradingApprovals,
  ensureDepositTradingApprovalsForMarket,
  ensureDepositErc1155Approvals,
  ensureDepositErc1155ApprovalsForMarket,
  executeDepositTradingApprovalBatch,
  executeDepositWalletRelayBatch,
  executeDepositWalletRelayBatches,
  executeDepositWalletRelayBatchInChunks,
  MARKET_MINIMAL_SINGLE_BATCH_MAX,
} from "./depositVaultOps";
