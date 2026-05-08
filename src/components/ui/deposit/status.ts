import type { ExecutionKind } from "./types";
import type { BridgeTransaction } from "@/types/bridge";

const TRANSFER_STATUS_HISTORY_TOLERANCE_MS = 15_000;

export function isBridgeCompletedStatus(status?: string): boolean {
  return (status || "").trim().toUpperCase() === "COMPLETED";
}

export function getStatusText(locale: string, status?: string): string {
  const zh = locale === "zh";
  switch (status) {
    case "DEPOSIT_DETECTED":
      return zh ? "已检测" : "Detected";
    case "PROCESSING":
      return zh ? "处理中" : "Processing";
    case "ORIGIN_TX_CONFIRMED":
      return zh ? "源链已确认" : "Origin Confirmed";
    case "SUBMITTED":
      return zh ? "已提交" : "Submitted";
    case "COMPLETED":
      return zh ? "已到账" : "Completed";
    case "FAILED":
      return zh ? "失败" : "Failed";
    default:
      return zh ? "等待转账" : "Waiting";
  }
}

export function getExecutionKindText(
  locale: string,
  kind: ExecutionKind,
  assetSymbol?: string
): string {
  const zh = locale === "zh";
  switch (kind) {
    case "direct-transfer": {
      const sym = assetSymbol?.trim() || "Token";
      return zh ? `${sym} 直转入金` : `${sym} direct deposit`;
    }
    case "same-chain":
      return zh ? "deBridge 同链兑换" : "deBridge same-chain swap";
    case "cross-chain":
      return zh ? "deBridge 跨链兑换" : "deBridge cross-chain swap";
    default:
      return zh ? "连接钱包充值" : "Connected wallet deposit";
  }
}

export function getExecutionStatusText({
  bridgeStatus,
  dlnStatus,
  isExecuting,
  locale,
  txHash,
}: {
  bridgeStatus?: string;
  dlnStatus?: string;
  isExecuting: boolean;
  locale: string;
  txHash: string;
}): string {
  const zh = locale === "zh";
  if (isExecuting) return zh ? "等待钱包确认" : "Waiting for wallet";
  if (bridgeStatus === "COMPLETED") return zh ? "已入账" : "Deposited";
  if (bridgeStatus) return getStatusText(locale, bridgeStatus);
  if (dlnStatus === "ClaimedUnlock") return zh ? "兑换完成，等待入账" : "Swap fulfilled, waiting deposit";
  if (dlnStatus) return getDlnStatusText(locale, dlnStatus);
  if (txHash) return zh ? "订单已提交" : "Order submitted";
  return zh ? "等待确认" : "Ready";
}

export function getTransferStatusSinceAddressCreated(
  transactions: BridgeTransaction[] | undefined,
  addressCreatedAtMs: number
): string | undefined {
  const list = transactions ?? [];
  if (list.length === 0) return undefined;

  const threshold = addressCreatedAtMs > 0
    ? addressCreatedAtMs - TRANSFER_STATUS_HISTORY_TOLERANCE_MS
    : 0;
  const candidates = list.filter((tx) => {
    const createdTimeMs = Number(tx.createdTimeMs ?? 0);
    if (!Number.isFinite(createdTimeMs) || createdTimeMs <= 0) {
      return addressCreatedAtMs <= 0;
    }
    return createdTimeMs >= threshold;
  });

  const latest = candidates.reduce<BridgeTransaction | undefined>((acc, tx) => {
    if (!acc) return tx;
    const prev = Number(acc.createdTimeMs ?? 0);
    const next = Number(tx.createdTimeMs ?? 0);
    return next >= prev ? tx : acc;
  }, undefined);

  return latest?.status;
}

function getDlnStatusText(locale: string, status?: string): string {
  const zh = locale === "zh";
  switch (status) {
    case "Created":
      return zh ? "订单已创建" : "Order created";
    case "Fulfilled":
      return zh ? "目标链已兑付" : "Fulfilled";
    case "SentUnlock":
      return zh ? "解锁中" : "Unlock sent";
    case "ClaimedUnlock":
      return zh ? "已完成" : "Completed";
    case "SentOrderCancel":
      return zh ? "取消中" : "Cancel sent";
    case "OrderCancelled":
    case "ClaimedOrderCancel":
      return zh ? "已取消" : "Cancelled";
    default:
      return zh ? "处理中" : "Processing";
  }
}
