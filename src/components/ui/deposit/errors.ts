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
  if (upper.includes("LEADING ZERO DIGITS") || upper.includes("INVALID PARAMS")) {
    return zh
      ? "交易参数格式错误，请返回重试或刷新页面后再确认订单。"
      : "Invalid transaction parameters. Go back, refresh, and try confirming again.";
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
  if (upper.includes("GAS LIMIT TOO HIGH") && upper.includes("CAP:")) {
    return zh
      ? "钱包无法为当前金额估算网络费（常见于原生币余额几乎用尽）。请降低充值金额或补充 POL 后重试。"
      : "The wallet could not estimate gas for this amount (often when the native balance is nearly exhausted). Lower the deposit or add POL, then retry.";
  }
  if (
    upper.includes("INSUFFICIENT") ||
    upper.includes("NOT ENOUGH") ||
    upper.includes("GAS REQUIRED EXCEEDS") ||
    upper.includes("INSUFFICIENT FUNDS") ||
    upper.includes("EXCEEDS BALANCE") ||
    upper.includes("CANNOT ESTIMATE GAS") ||
    upper.includes("UNABLE TO ESTIMATE GAS") ||
    upper.includes("ESTIMATION FAILED") ||
    upper.includes("ESTIMATE GAS")
  ) {
    return zh
      ? "钱包余额不足以支付充值金额与网络费，或钱包无法估算网络费。请降低金额、补充原生币，或在钱包中查看具体原因。"
      : "Insufficient balance for the deposit and network fee, or the wallet could not estimate gas. Lower the amount, add native tokens for fees, or check the wallet for details.";
  }
  if (upper.includes("GAS LIMIT TOO HIGH")) {
    return zh
      ? "交易 gas 上限异常，请降低充值金额后重试，或在钱包中查看详情。"
      : "Transaction gas limit is invalid. Lower the deposit amount or check the wallet for details.";
  }
  if (upper.includes("INTRINSIC GAS") || upper.includes("EXCEEDS BLOCK GAS LIMIT")) {
    return zh
      ? "交易参数无效或网络费估算失败，请降低金额后重试，或在钱包中查看详情。"
      : "Invalid transaction parameters or gas estimation failed. Lower the amount or check the wallet for details.";
  }
  if (
    upper.includes("FAILED TO SIGN") ||
    upper.includes("-32603") ||
    upper.includes("INTERNAL JSON-RPC")
  ) {
    return zh
      ? "钱包无法签名或提交交易。请确认网络与金额正确，或在钱包中查看拒绝原因后重试；亦可改用 Transfer Crypto。"
      : "The wallet could not sign or submit the transaction. Check the network and amount in the wallet, then retry or use Transfer Crypto.";
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
      ? "交易已在链上失败。请降低金额或在钱包 / 区块浏览器中查看原因，亦可改用 Transfer Crypto。"
      : "Transaction failed on chain. Lower the amount or check the wallet or block explorer; you can also use Transfer Crypto.";
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

/** 合并钱包 / RPC 嵌套字段，便于面板展示原始原因。 */
export function extractErrorText(error: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();

  const walk = (value: unknown, depth: number) => {
    if (value == null || depth > 6 || seen.has(value)) return;
    if (typeof value === "object") {
      seen.add(value);
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) parts.push(trimmed);
      return;
    }

    if (value instanceof Error) {
      if (value.message.trim()) parts.push(value.message.trim());
      walk("cause" in value ? (value as Error & { cause?: unknown }).cause : undefined, depth + 1);
      if ("details" in value) {
        walk((value as Error & { details?: unknown }).details, depth + 1);
      }
      return;
    }

    if (typeof value !== "object") return;

    const record = value as Record<string, unknown>;
    for (const key of ["message", "reason", "shortMessage", "details", "data", "error", "body"]) {
      if (key in record) {
        walk(record[key], depth + 1);
      }
    }
  };

  walk(error, 0);
  return [...new Set(parts)].join(" ");
}
