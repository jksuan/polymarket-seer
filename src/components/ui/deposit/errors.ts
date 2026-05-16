export function formatExecutionError(
  error: unknown,
  locale: string,
  fallback: "quote" | "execute" | "cancel"
): string {
  const zh = locale === "zh";
  const raw = extractErrorText(error);
  const upper = raw.toUpperCase();

  if (upper.includes("USER_REJECTED") || upper.includes("USER DENIED") || upper.includes("REJECTED")) {
    return "";
  }
  if (upper.includes("ERROR_LOW_GIVE_AMOUNT") || upper.includes("LOW_GIVE") || upper.includes("MINIMUM")) {
    return zh ? "金额低于 deBridge 当前路线的最低要求，请提高金额后重试。" : "Amount is below the current deBridge route minimum. Increase the amount and retry.";
  }
  if (upper.includes("IMPOSSIBLE_ROUTE")) {
    return zh ? "当前链和资产没有可用的 deBridge 路线。" : "No deBridge route is currently available for this chain and asset.";
  }
  if (upper.includes("UNSUPPORTED_TOKEN_IN") || upper.includes("UNSUPPORTED_TOKEN_OUT")) {
    return zh ? "当前资产暂不支持一键充值，请改用 Transfer Crypto。" : "This asset is not supported for one-click deposit. Use Transfer Crypto instead.";
  }
  if (upper.includes("ESTIMATION_FAILED")) {
    return zh ? "交易估算失败，请稍后重试或降低金额。" : "Transaction estimation failed. Try again later or lower the amount.";
  }
  if (upper.includes("INSUFFICIENT") || upper.includes("NOT ENOUGH")) {
    return zh ? "钱包余额不足，无法覆盖金额或 gas。" : "Insufficient wallet balance for the amount or gas.";
  }
  if (
    upper.includes("GAS LIMIT TOO HIGH") ||
    upper.includes("INTRINSIC GAS") ||
    (upper.includes("GAS") && upper.includes("CAP"))
  ) {
    return zh
      ? "网络费估算异常，通常因原生币余额未预留 gas。请降低充值金额或补充少量原生币后重试。"
      : "Gas estimation failed, often because the full native balance was sent without reserving gas. Lower the amount or add native tokens for fees.";
  }
  if (
    upper.includes("FAILED TO SIGN") ||
    upper.includes("-32603") ||
    upper.includes("INTERNAL JSON-RPC")
  ) {
    return zh
      ? "钱包无法签名或提交交易。请确认已切换到正确网络、金额与 gas 合理，或在钱包中拒绝后重试；亦可改用 Transfer Crypto。"
      : "The wallet could not sign or submit the transaction. Check the network and amount, reject and retry in the wallet, or use Transfer Crypto.";
  }
  if (upper.includes("TIMEOUT") && upper.includes("PROVIDERS/")) {
    return zh
      ? "交易已提交但暂未在链上确认。请在钱包或区块浏览器查看进度；若长时间无记录，可改用 Transfer Crypto 重试。"
      : "The transaction was submitted but not confirmed yet. Check your wallet or a block explorer; if nothing appears, retry with Transfer Crypto.";
  }
  if (upper.includes("NOT CONFIRMED ON CHAIN") || upper.includes("WITHIN 90S")) {
    return zh
      ? "交易未在链上确认（可能已被丢弃）。请在钱包活动记录中查看，或改用 Transfer Crypto。"
      : "Transaction was not confirmed on chain (it may have been dropped). Check wallet activity or use Transfer Crypto.";
  }
  if (upper.includes("FAILED ON CHAIN")) {
    return zh
      ? "交易已在链上失败。请降低金额、保留 POL 作 gas，或改用 Transfer Crypto。"
      : "Transaction failed on chain. Lower the amount, keep POL for gas, or use Transfer Crypto.";
  }
  if (upper.includes("UNKNOWN_ORDER")) {
    return zh ? "未找到该 deBridge 订单，可能尚未被索引。" : "deBridge order was not found yet. It may still be indexing.";
  }
  if (upper.includes("ORDER_ALREADY_FULFILLED")) {
    return zh ? "该订单已完成，不能取消退款。" : "This order has already been fulfilled and cannot be cancelled.";
  }

  if (raw) return raw;

  if (fallback === "quote") {
    return zh ? "获取报价失败，请稍后重试。" : "Failed to get a quote. Please try again.";
  }
  if (fallback === "cancel") {
    return zh ? "生成或提交退款交易失败。" : "Failed to create or submit the refund transaction.";
  }
  return zh ? "确认订单失败，请稍后重试。" : "Failed to confirm order. Please try again.";
}

function extractErrorText(error: unknown): string {
  if (error instanceof Error) {
    const details = "details" in error ? (error as { details?: unknown }).details : undefined;
    return [error.message, stringifyErrorDetails(details)].filter(Boolean).join(" ");
  }
  return String(error ?? "");
}

function stringifyErrorDetails(details: unknown): string {
  if (!details) return "";
  if (typeof details === "string") return details;
  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}
