export type WithdrawRecipientAddressType = "evm" | "svm" | "btc" | "tron";

const SOLANA_CHAIN_ID = "1151111081099710";
const BITCOIN_CHAIN_ID = "8253038";
const TRON_CHAIN_ID = "728126428";

/** Map Bridge destination chain to recipient address format expected by Polymarket withdraw. */
export function resolveRecipientAddressType(
  chainId: string,
  chainName?: string
): WithdrawRecipientAddressType {
  const id = chainId.trim();
  const name = (chainName || "").trim().toLowerCase();

  if (id === SOLANA_CHAIN_ID || name.includes("solana")) return "svm";
  if (id === BITCOIN_CHAIN_ID || name.includes("bitcoin") || name === "btc") return "btc";
  if (id === TRON_CHAIN_ID || name.includes("tron")) return "tron";
  return "evm";
}
