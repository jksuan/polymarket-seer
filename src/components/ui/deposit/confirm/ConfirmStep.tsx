import { useLayoutEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, Wallet } from "lucide-react";
import { POLYGON_CHAIN_ID } from "@/lib/constants";
import type { ExecutionSnapshot } from "../types";
import { formatMs, formatUsd } from "../format";
import { getExecutionKindText } from "../status";
import { InfoBox, TokenIcon } from "../shared-ui";
import { WalletPromptBridge } from "./wallet-prompt-bridge";
import { ConfirmTransactionBreakdown } from "./transaction-breakdown";

export function ConfirmStep({
  cancelTxHash,
  depositBridgeComplete,
  dlnStatus,
  error,
  executionRiskWarning,
  hasSubmittedTx,
  hasUnconfirmedRiskWarning,
  isCancellingOrder,
  isExecuting,
  isQuoting,
  locale,
  onCancelOrder,
  onConfirm,
  onFallbackToTransfer,
  quoteWarning,
  snapshot,
  walletLabel,
}: {
  cancelTxHash: string;
  depositBridgeComplete: boolean;
  dlnStatus?: string;
  error: string;
  executionRiskWarning: string;
  hasSubmittedTx: boolean;
  hasUnconfirmedRiskWarning: boolean;
  isCancellingOrder: boolean;
  isExecuting: boolean;
  isQuoting: boolean;
  locale: string;
  onCancelOrder: () => void;
  onConfirm: () => void;
  onFallbackToTransfer: () => void;
  quoteWarning: string;
  snapshot: ExecutionSnapshot;
  walletLabel: string;
}) {
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const breakdownDetailsRef = useRef<HTMLDivElement>(null);
  const canCancel = Boolean(
    dlnStatus &&
    !["ClaimedUnlock", "OrderCancelled", "ClaimedOrderCancel"].includes(dlnStatus)
  );
  const buttonText = isQuoting
    ? locale === "zh" ? "重新获取最新价格" : "Refreshing latest price..."
    : isExecuting
      ? locale === "zh" ? "等待钱包确认..." : "Waiting for wallet..."
      : depositBridgeComplete
        ? locale === "zh" ? "充值成功" : "Deposit complete"
        : hasUnconfirmedRiskWarning
          ? locale === "zh" ? "再次确认并继续" : "Confirm again to continue"
          : hasSubmittedTx
            ? locale === "zh" ? "已提交" : "Submitted"
            : locale === "zh" ? "确认订单" : "Confirm Order";

  const sendUsdText =
    snapshot.sendUsd !== undefined ? ` ≈ ${formatUsd(snapshot.sendUsd)}` : "";
  const receiveUsdText =
    snapshot.receiveUsd !== undefined ? ` ≈ ${formatUsd(snapshot.receiveUsd)}` : "";
  const receiveSymbol = snapshot.receiveSymbol ?? "pUSD";

  const walletTotalText = snapshot.walletTotalDisplay
    ? `${snapshot.walletTotalDisplay}${snapshot.walletTotalUsd === undefined ? "" : ` ≈ ${formatUsd(snapshot.walletTotalUsd)}`}`
    : "-";
  const youSendText = snapshot.fixedFeeDisplay ? walletTotalText : `${snapshot.sendDisplay}${sendUsdText}`;

  const submittedHint =
    depositBridgeComplete
      ? locale === "zh"
        ? "Polymarket 已检测到入账，余额将更新；可关闭本面板。"
        : "Polymarket has credited your deposit. You can close this panel."
      : snapshot.kind === "direct-transfer"
        ? locale === "zh"
          ? "交易提交后请等待链上确认，再等待 Polymarket 检测入账。"
          : "After submission, wait for on-chain confirmation and Polymarket deposit detection."
        : locale === "zh"
          ? "交易提交后请等待 deBridge 完成兑换，再等待 Polymarket 检测入账。"
          : "After submission, wait for deBridge fulfillment and Polymarket deposit detection.";

  useLayoutEffect(() => {
    if (!isBreakdownOpen) return undefined;

    const frame = window.requestAnimationFrame(() => {
      breakdownDetailsRef.current?.scrollIntoView({
        block: "end",
        behavior: "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isBreakdownOpen]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-y-contain pb-2">
        <div className="py-4 text-center text-4xl font-black text-white">
          ${snapshot.amountUsd.toFixed(2)}
        </div>

        <InfoBox
          rows={[
            {
              label: "Source",
              value: walletLabel,
              icon: (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                  <Wallet aria-hidden className="text-white/70" size={18} strokeWidth={1.75} />
                </div>
              ),
            },
            {
              label: "Destination",
              value: "Polymarket Wallet",
              icon: (
                <span
                  aria-hidden
                  className="block h-5 w-5 shrink-0 rounded-full bg-cover bg-center"
                  style={{ backgroundImage: "url(/polymarket-icon.png)" }}
                />
              ),
            },
            {
              label: "Execution",
              value: getExecutionKindText(locale, snapshot.kind, snapshot.asset.symbol),
              icon:
                snapshot.kind === "direct-transfer" ? (
                  <TokenIcon compact chainId={snapshot.asset.chainId} symbol={snapshot.asset.symbol} />
                ) : (
                  <img
                    alt=""
                    aria-hidden
                    className="block h-5 w-5 shrink-0 object-contain"
                    height={20}
                    src="/debridge.svg"
                    width={20}
                  />
                ),
            },
            ["Estimated time", formatMs(snapshot.estCheckoutTimeMs)],
          ]}
        />

        <InfoBox
          rows={[
            {
              label: "You send",
              value: youSendText,
              icon: (
                <TokenIcon
                  compact
                  chainId={snapshot.asset.chainId}
                  iconUrl={snapshot.asset.iconUrl}
                  symbol={snapshot.asset.symbol}
                />
              ),
            },
            {
              label: "You receive",
              value: `${snapshot.receiveDisplay} ${receiveSymbol}${receiveUsdText}`,
              icon: <TokenIcon compact chainId={String(POLYGON_CHAIN_ID)} symbol={receiveSymbol} />,
            },
          ]}
        />

        <WalletPromptBridge locale={locale} snapshot={snapshot} walletTotalText={walletTotalText} />

        <ConfirmTransactionBreakdown
          breakdownDetailsRef={breakdownDetailsRef}
          isOpen={isBreakdownOpen}
          locale={locale}
          onToggleOpen={() => setIsBreakdownOpen((open) => !open)}
          snapshot={snapshot}
        />

        {quoteWarning && (
          <div className="rounded-2xl border border-[#ffd166]/20 bg-[#ffd166]/10 p-3 text-[11px] leading-relaxed text-[#ffe6a6]">
            {quoteWarning}
          </div>
        )}
        {executionRiskWarning && (
          <div className="rounded-2xl border border-[#ffd166]/20 bg-[#ffd166]/10 p-3 text-[11px] leading-relaxed text-[#ffe6a6]">
            {executionRiskWarning}
          </div>
        )}

        {error && (
          <div className="flex gap-3 rounded-2xl border border-[#ff6b6b]/20 bg-[#ff6b6b]/10 p-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-[#ff6b6b]" size={16} />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-[11px] leading-relaxed text-[#ffcad4]/80">{error}</p>
              <button
                type="button"
                onClick={onFallbackToTransfer}
                className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-[11px] font-black text-white active:scale-[0.98]"
              >
                {locale === "zh" ? "改走 Transfer Crypto" : "Use Transfer Crypto instead"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 space-y-3 pt-4">
        <button
          onClick={onConfirm}
          disabled={isQuoting || isExecuting || hasSubmittedTx}
          className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-black text-white active:scale-[0.98] disabled:opacity-50 ${
            depositBridgeComplete ? "bg-emerald-600 disabled:opacity-100" : "bg-[#159bff]"
          }`}
        >
          {isExecuting || isQuoting ? <Loader2 className="animate-spin" size={18} /> : null}
          {buttonText}
        </button>

        {hasSubmittedTx && (
          <div
            className={`text-center text-xs ${
              depositBridgeComplete ? "text-emerald-400/90" : "text-white/35"
            }`}
          >
            {submittedHint}
          </div>
        )}

        {canCancel && (
          <button
            onClick={onCancelOrder}
            disabled={isCancellingOrder || Boolean(cancelTxHash)}
            className="flex h-12 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-white/70 active:scale-[0.98] disabled:opacity-50"
          >
            {isCancellingOrder ? (
              <Loader2 className="animate-spin" size={16} />
            ) : cancelTxHash ? (
              locale === "zh" ? "退款交易已提交" : "Refund submitted"
            ) : (
              locale === "zh" ? "取消订单并退款" : "Cancel order and refund"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
