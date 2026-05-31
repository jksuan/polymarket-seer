export type { TradingVaultContext, TradingVaultKind } from "./types";
export { resolveTradingVault } from "./resolveTradingVault";
export { createTradingRelayClient } from "./relayClientFactory";
export {
  ensureDepositVaultDeployed,
  ensureDepositTradingApprovals,
  ensureDepositErc1155Approvals,
  executeDepositTradingApprovalBatch,
  executeDepositWalletRelayBatch,
  executeDepositWalletRelayBatchInChunks,
} from "./depositVaultOps";
