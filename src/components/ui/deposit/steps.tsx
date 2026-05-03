import { useLayoutEffect, useRef } from "react";
import type { ChangeEvent } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  Loader2,
  QrCode,
  Store,
  Wallet,
} from "lucide-react";
import QRCode from "react-qr-code";
import { POLYGON_CHAIN_ID } from "@/lib/constants";
import type { CreateDepositResponse } from "@/types/bridge";
import type { DepositAsset, ExecutionSnapshot } from "./types";
import { sortVisibleAssets } from "./assets";
import { CHAIN_ICON_URLS, CONNECTED_LOW_BALANCE_USD, DEPOSIT_SINGLE_TX_CAP_USD, MAX_DEPOSIT_BALANCE_RATIO, QUOTE_STALE_THRESHOLD_MS, TOKEN_ICON_URLS } from "./constants";
import { formatCompactBalance, formatMs, formatPercent, formatUsd, formatUsdWithCommas, parseAmountUsd } from "./format";
import { getExecutionKindText } from "./status";

export function HomeStep({
  locale,
  walletLabel,
  walletUsd,
  onWallet,
  onTransfer,
}: {
  locale: string;
  walletLabel: string;
  walletUsd: number;
  onWallet: () => void;
  onTransfer: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-black/20 p-1">
        <div className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-3 text-sm font-black text-white">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-black">{"₿"}</span>
          Use Crypto
        </div>
        <div className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-black text-white/30">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">$</span>
          Use Cash
        </div>
      </div>

      <section>
        <p className="mb-2 text-sm font-bold text-white/45">Connected</p>
        <button
          onClick={onWallet}
          className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all active:scale-[0.98] hover:bg-white/[0.06]"
        >
          <div className="flex items-center gap-3">
            <Wallet className="text-white/70" size={24} />
            <div>
              <p className="text-sm font-black text-white">{walletLabel}</p>
              <p className="text-xs text-white/40">
                ${walletUsd.toFixed(2)} {"•"} {locale === "zh" ? "即时" : "Instant"}
              </p>
            </div>
          </div>
          <ArrowRight className="text-white/30" size={18} />
        </button>
      </section>

      <section>
        <p className="mb-2 text-sm font-bold text-white/45">Other options</p>
        <button
          onClick={onTransfer}
          className="mb-2 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all active:scale-[0.98] hover:bg-white/[0.06]"
        >
          <div className="flex items-center gap-3">
            <QrCode className="text-white/70" size={24} />
            <div>
              <p className="text-sm font-black text-white">Transfer Crypto</p>
              <p className="text-xs text-white/40">
                {locale === "zh" ? "不限 • 即时" : "No limit • Instant"}
              </p>
            </div>
          </div>
          <span className="text-xs text-white/30">{"EVM • SOL • BTC"}</span>
        </button>
        <div className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4 opacity-50">
          <div className="flex items-center gap-3">
            <Store className="text-white/70" size={24} />
            <div>
              <p className="text-sm font-black text-white">Connect Exchange</p>
              <p className="text-xs text-white/40">{locale === "zh" ? "暂不支持" : "Not supported yet"}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function AssetStep({
  assets,
  assetsLoading,
  locale,
  onSelect,
}: {
  assets: DepositAsset[];
  assetsLoading: boolean;
  locale: string;
  onSelect: (asset: DepositAsset) => void;
}) {
  const displayAssets = sortVisibleAssets(assets).slice(0, 8);

  return (
    <div className="space-y-2">
      {assetsLoading && (
        <div className="flex items-center justify-center py-12 text-white/40">
          <Loader2 className="mr-2 animate-spin" size={18} />
          {locale === "zh" ? "正在加载资产..." : "Loading assets..."}
        </div>
      )}

      {!assetsLoading && displayAssets.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/50">
          {locale === "zh" ? "暂无可用资产列表，请稍后重试。" : "No supported assets found. Please try again later."}
        </div>
      )}

      {displayAssets.map((asset) => {
        const balance = Number(asset.balance || 0);
        const usdValue = asset.usdValue ?? 0;
        const isLow = usdValue > 0 && usdValue < CONNECTED_LOW_BALANCE_USD;
        return (
          <button
            key={asset.id}
            onClick={() => onSelect(asset)}
            className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${
              balance > 0
                ? "border-white/30 bg-white/[0.04] hover:bg-white/[0.07]"
                : "border-transparent bg-transparent opacity-55"
            }`}
          >
            <div className="flex items-center gap-3">
              <TokenIcon chainId={asset.chainId} iconUrl={asset.iconUrl} symbol={asset.symbol} />
              <div>
                <p className="text-base font-black text-white">{asset.symbol}</p>
                <p className="text-xs text-white/40">
                  {formatCompactBalance(asset.balance)} {asset.symbol}
                </p>
              </div>
            </div>
            <div className="text-right">
              {isLow && <p className="text-xs text-white/25">Low Balance</p>}
              <p className="text-sm font-black text-white/80">${(asset.usdValue ?? 0).toFixed(2)}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function AmountStep({
  amountUsd,
  asset,
  error,
  isQuoting,
  locale,
  onAmountBlur,
  onAmountChange,
  onContinue,
  onPercent,
}: {
  amountUsd: string;
  asset: DepositAsset;
  error: string;
  isQuoting: boolean;
  locale: string;
  onAmountBlur: () => void;
  onAmountChange: (value: string) => void;
  onContinue: () => void;
  onPercent: (percent: number) => void;
}) {
  const amountNumber = parseAmountUsd(amountUsd);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaretCountRef = useRef<number | null>(null);
  const balanceMaxDepositUsd = Number(asset.usdValue ?? 0) * MAX_DEPOSIT_BALANCE_RATIO;
  const maxDepositUsd = Math.min(balanceMaxDepositUsd, DEPOSIT_SINGLE_TX_CAP_USD);
  const isAmountTooLow = amountNumber < 1;
  const isAmountOverSingleTxCap = amountNumber > DEPOSIT_SINGLE_TX_CAP_USD + 0.01;
  const isAmountOverBalance = amountNumber > maxDepositUsd + 0.01;
  const amountWarning = isAmountTooLow
    ? locale === "zh" ? "最低充值金额$1" : "$1.00 minimum deposit"
    : isAmountOverSingleTxCap
      ? locale === "zh"
        ? `单笔最高充值${formatUsdWithCommas(DEPOSIT_SINGLE_TX_CAP_USD)}，请分笔充值`
        : `Single deposit limit is ${formatUsdWithCommas(DEPOSIT_SINGLE_TX_CAP_USD)}. Please split your deposit.`
      : isAmountOverBalance
      ? locale === "zh" ? "钱包余额不足" : "Insufficient balance"
      : "";
  const amountInputWidth = `${Math.max(amountUsd.length || 1, 1)}ch`;

  useLayoutEffect(() => {
    const caretCount = pendingCaretCountRef.current;
    const input = inputRef.current;
    if (caretCount === null || !input) return;

    const nextCaret = getCaretPositionFromAmountCharCount(amountUsd, caretCount);
    input.setSelectionRange(nextCaret, nextCaret);
    pendingCaretCountRef.current = null;
  }, [amountUsd]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const caret = event.currentTarget.selectionStart ?? event.currentTarget.value.length;
    pendingCaretCountRef.current = countAmountInputChars(event.currentTarget.value.slice(0, caret));
    onAmountChange(event.currentTarget.value);
  };

  return (
    <div className="flex min-h-[520px] flex-col justify-between">
      <div>
        <div className="mt-16 flex justify-center">
          <div className="inline-flex items-center justify-center text-5xl font-black text-white">
            <span>$</span>
            <input
              ref={inputRef}
              value={amountUsd}
              onBlur={onAmountBlur}
              onChange={handleInputChange}
              placeholder="0"
              style={{ width: amountInputWidth }}
              className="min-w-[1ch] max-w-[360px] bg-transparent text-left text-5xl font-black text-white outline-none placeholder:text-white/35"
              inputMode="decimal"
            />
          </div>
        </div>
        <div className="mt-10 flex justify-center gap-3">
          {[0.25, 0.5, 0.75, 1].map((percent) => (
            <button
              key={percent}
              onClick={() => onPercent(percent)}
              className="rounded-xl bg-white/10 px-5 py-3 text-sm font-black text-white active:scale-95"
            >
              {percent === 1 ? "Max" : `${Math.round(percent * 100)}%`}
            </button>
          ))}
        </div>
        {error && (
          <div className="mt-6 rounded-2xl border border-[#ff6b6b]/20 bg-[#ff6b6b]/10 p-3 text-xs text-[#ffcad4]">
            {error}
          </div>
        )}
      </div>

      <div className="pb-5">
        {amountWarning && (
          <p className="mb-4 text-center text-xs font-semibold text-[#ffb25c]">
            {amountWarning}
          </p>
        )}
        <div className="mx-auto mb-7 flex w-fit items-center gap-4 rounded-full bg-white/10 px-4 py-3">
          <TokenIcon chainId={asset.chainId} iconUrl={asset.iconUrl} symbol={asset.symbol} />
          <div>
            <p className="text-[10px] text-white/35">You send</p>
            <p className="text-xs font-black text-white">{asset.symbol}</p>
          </div>
          <ArrowRight className="text-white/35" size={18} />
          <TokenIcon chainId={String(POLYGON_CHAIN_ID)} symbol="pUSD" />
          <div>
            <p className="text-[10px] text-white/35">You receive</p>
            <p className="text-xs font-black text-white">pUSD</p>
          </div>
        </div>
        <button
          onClick={onContinue}
          disabled={isQuoting || isAmountTooLow || isAmountOverBalance}
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#159bff] text-base font-black text-white active:scale-[0.98] disabled:opacity-50"
        >
          {isQuoting ? <Loader2 className="animate-spin" size={18} /> : locale === "zh" ? "继续" : "Continue"}
        </button>
      </div>
    </div>
  );
}

export function ConfirmStep({
  cancelTxHash,
  dlnStatus,
  error,
  executionStatusText,
  executionTxHash,
  hasSubmittedTx,
  isCancellingOrder,
  isExecuting,
  isQuoting,
  locale,
  onCancelOrder,
  onConfirm,
  quoteWarning,
  snapshot,
  walletLabel,
}: {
  cancelTxHash: string;
  dlnStatus?: string;
  error: string;
  executionStatusText: string;
  executionTxHash: string;
  hasSubmittedTx: boolean;
  isCancellingOrder: boolean;
  isExecuting: boolean;
  isQuoting: boolean;
  locale: string;
  onCancelOrder: () => void;
  onConfirm: () => void;
  quoteWarning: string;
  snapshot: ExecutionSnapshot;
  walletLabel: string;
}) {
  const canCancel = Boolean(
    dlnStatus &&
    !["ClaimedUnlock", "OrderCancelled", "ClaimedOrderCancel"].includes(dlnStatus)
  );
  const buttonText = isExecuting
    ? locale === "zh" ? "等待钱包确认..." : "Waiting for wallet..."
    : hasSubmittedTx
      ? locale === "zh" ? "已提交" : "Submitted"
      : locale === "zh" ? "确认订单" : "Confirm Order";

  const slippageText =
    snapshot.slippage === undefined
      ? "Auto"
      : `Auto • ${formatPercent(snapshot.slippage)}`;

  const sendUsdText = snapshot.sendUsd !== undefined
    ? ` ≈ ${formatUsd(snapshot.sendUsd)}`
    : "";
  const receiveUsdText = snapshot.receiveUsd !== undefined
    ? ` ≈ ${formatUsd(snapshot.receiveUsd)}`
    : "";

  const fixedFeeText = snapshot.fixedFeeDisplay
    ? `${snapshot.fixedFeeDisplay}${snapshot.fixedFeeUsd === undefined ? "" : ` ≈ ${formatUsd(snapshot.fixedFeeUsd)}`}`
    : "-";
  const walletTotalText = snapshot.walletTotalDisplay
    ? `${snapshot.walletTotalDisplay}${snapshot.walletTotalUsd === undefined ? "" : ` ≈ ${formatUsd(snapshot.walletTotalUsd)}`}`
    : "-";
  const youSendText = snapshot.fixedFeeDisplay ? walletTotalText : `${snapshot.sendDisplay}${sendUsdText}`;
  const walletPromptText = snapshot.asset.isNative
    ? (locale === "zh"
        ? `You send 包含下方的 deBridge fixed fee，钱包弹窗可能显示 ${walletTotalText}。`
        : `You send includes the deBridge fixed fee below. Your wallet may prompt ${walletTotalText}.`)
    : snapshot.kind === "direct"
      ? (locale === "zh"
          ? `钱包将弹出一笔 ${snapshot.sendDisplay}${sendUsdText} 的 ERC20 转账，与上方"You send"完全一致。`
          : `Your wallet will prompt for an ERC20 transfer of ${snapshot.sendDisplay}${sendUsdText}, matching "You send" exactly.`)
      : (locale === "zh"
          ? `You send 包含下方的 deBridge fixed fee，钱包弹窗可能显示 ${walletTotalText}。`
          : `You send includes the deBridge fixed fee below. Your wallet may prompt ${walletTotalText}.`);

  return (
    <div className="space-y-5">
      <div className="py-5 text-center text-6xl font-black text-white">
        ${snapshot.amountUsd.toFixed(2)}
      </div>

      <InfoBox
        rows={[
          ["Source", walletLabel],
          ["Destination", "Polymarket Wallet"],
          ["Execution", getExecutionKindText(locale, snapshot.kind)],
          ["Estimated time", formatMs(snapshot.estCheckoutTimeMs)],
        ]}
      />

      <InfoBox
        rows={[
          ["You send", youSendText],
          ["You receive", `${snapshot.receiveDisplay} pUSD${receiveUsdText}`],
        ]}
      />

      <div className="rounded-2xl bg-white/8 p-3 text-xs leading-relaxed text-white/60">
        {walletPromptText}
      </div>

      <div>
        <p className="mb-3 text-sm font-bold text-white/35">Transaction breakdown</p>
        <InfoBox
          rows={[
            ["Network cost", formatUsd(snapshot.networkCostUsd)],
            ["deBridge fixed fee", fixedFeeText],
            ["Route cost", formatUsd(snapshot.routeCostUsd)],
            ["Price impact", formatPercent(snapshot.priceImpact)],
            ["Max slippage", slippageText],
            ["Wallet total", walletTotalText],
            ["Quote refresh", locale === "zh" ? `每 ${Math.round(QUOTE_STALE_THRESHOLD_MS / 1000)}s 自动刷新` : `Auto every ${Math.round(QUOTE_STALE_THRESHOLD_MS / 1000)}s`],
          ]}
        />
      </div>

      {quoteWarning && (
        <div className="rounded-2xl border border-[#ffd166]/20 bg-[#ffd166]/10 p-4 text-xs leading-relaxed text-[#ffe6a6]">
          {quoteWarning}
        </div>
      )}

      {(hasSubmittedTx || isExecuting) && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-white/40">{locale === "zh" ? "执行状态" : "Execution status"}</span>
            <span className="font-black text-white">{executionStatusText}</span>
          </div>
          {executionTxHash && (
            <p className="mt-2 break-all font-mono text-[11px] text-white/35">
              {executionTxHash}
            </p>
          )}
          {cancelTxHash && (
            <p className="mt-2 break-all font-mono text-[11px] text-[#ADFF2F]/70">
              {locale === "zh" ? "退款交易：" : "Refund tx:"} {cancelTxHash}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="flex gap-3 rounded-2xl border border-[#ff6b6b]/20 bg-[#ff6b6b]/10 p-4">
          <AlertTriangle className="mt-0.5 shrink-0 text-[#ff6b6b]" size={18} />
          <p className="text-xs leading-relaxed text-[#ffcad4]/80">{error}</p>
        </div>
      )}

      <button
        onClick={onConfirm}
        disabled={isQuoting || isExecuting || hasSubmittedTx}
        className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#159bff] text-base font-black text-white active:scale-[0.98] disabled:opacity-50"
      >
        {isExecuting ? <Loader2 className="animate-spin" size={18} /> : buttonText}
      </button>

      {hasSubmittedTx && (
        <div className="text-center text-xs text-white/35">
          {locale === "zh"
            ? "交易提交后请等待 deBridge 完成兑换，再等待 Polymarket 检测入账。"
            : "After submission, wait for deBridge fulfillment and Polymarket deposit detection."}
        </div>
      )}

      {canCancel && (
        <button
          onClick={onCancelOrder}
          disabled={isCancellingOrder || Boolean(cancelTxHash)}
          className="flex h-12 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-white/70 active:scale-[0.98] disabled:opacity-50"
        >
          {isCancellingOrder
            ? <Loader2 className="animate-spin" size={16} />
            : cancelTxHash
              ? locale === "zh" ? "退款交易已提交" : "Refund submitted"
              : locale === "zh" ? "取消订单并退款" : "Cancel order and refund"}
        </button>
      )}
    </div>
  );
}

export function TransferStep({
  copied,
  depositResponse,
  error,
  isCreating,
  locale,
  onCopy,
  onCreate,
  statusText,
  transferAddress,
}: {
  copied: boolean;
  depositResponse: CreateDepositResponse | null;
  error: string;
  isCreating: boolean;
  locale: string;
  onCopy: (value: string) => void;
  onCreate: () => void;
  statusText: string;
  transferAddress: string;
}) {
  const note = typeof depositResponse?.note === "string" ? depositResponse.note : "";

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <p className="text-sm font-black text-white">Transfer Crypto</p>
        <p className="mt-1 text-xs leading-relaxed text-white/45">
          {locale === "zh"
            ? "这是 Polymarket 的备用手动转账路径：生成地址后，从外部钱包或交易所转入支持资产。最低金额严格遵循 supported-assets。"
            : "This is the fallback transfer flow for wallets or exchanges. Minimums strictly follow supported-assets."}
        </p>
        <button
          onClick={onCreate}
          disabled={isCreating}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#ADFF2F] text-sm font-black text-[#0D0518] active:scale-[0.98] disabled:opacity-50"
        >
          {isCreating ? <Loader2 className="animate-spin" size={16} /> : <QrCode size={16} />}
          {transferAddress
            ? locale === "zh" ? "刷新地址" : "Refresh Address"
            : locale === "zh" ? "生成转账地址" : "Create Transfer Address"}
        </button>
      </div>

      {error && (
        <div className="flex gap-3 rounded-2xl border border-[#ff6b6b]/20 bg-[#ff6b6b]/10 p-4">
          <AlertTriangle className="mt-0.5 shrink-0 text-[#ff6b6b]" size={18} />
          <p className="text-xs leading-relaxed text-[#ffcad4]/80">{error}</p>
        </div>
      )}

      {transferAddress && (
        <>
          <div className="flex flex-col items-center rounded-3xl border border-white/5 bg-white/5 p-6">
            <div className="mb-5 rounded-2xl bg-white p-3">
              <QRCode value={transferAddress} size={160} viewBox="0 0 160 160" />
            </div>
            <button
              onClick={() => onCopy(transferAddress)}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/40 p-3 active:scale-[0.98]"
            >
              <span className="mr-3 break-all text-left font-mono text-[11px] text-white">
                {transferAddress}
              </span>
              {copied ? <CheckCircle2 className="text-green-400" size={18} /> : <Copy className="text-white/60" size={18} />}
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white">{locale === "zh" ? "状态" : "Status"}</p>
              <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[10px] font-black uppercase text-white/60">
                {statusText}
              </span>
            </div>
            {note && <p className="mt-2 text-xs text-white/45">{note}</p>}
          </div>
        </>
      )}
    </div>
  );
}

function InfoBox({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
      {rows.map(([label, value], index) => (
        <div
          key={label}
          className={`flex items-center justify-between px-4 py-3 text-sm ${
            index > 0 ? "border-t border-white/5" : ""
          }`}
        >
          <span className="text-white/40">{label}</span>
          <span className="font-black text-white">{value}</span>
        </div>
      ))}
    </div>
  );
}

function TokenIcon({ chainId, iconUrl, symbol }: { chainId?: string; iconUrl?: string; symbol: string }) {
  const label = symbol.slice(0, 1).toUpperCase();
  const fallbackUrl = TOKEN_ICON_URLS[symbol.toUpperCase()];
  const imageUrl = iconUrl || fallbackUrl;
  const chainIconUrl = chainId ? CHAIN_ICON_URLS[chainId] : undefined;
  const isPolymarketUsd = symbol.toUpperCase() === "PUSD";
  const isEth = symbol.toUpperCase() === "ETH";

  return (
    <div className="relative h-10 w-10 shrink-0">
      {imageUrl ? (
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full shadow-[0_0_16px_rgba(99,125,255,0.25)] ${
            isPolymarketUsd ? "bg-[#2B5BED]" : isEth ? "bg-transparent" : "bg-white/10"
          }`}
        >
          <span
            aria-label={symbol}
            className={`rounded-full bg-center bg-no-repeat ${
              isPolymarketUsd
                ? "h-8 w-8 bg-contain"
                : isEth
                  ? "h-10 w-10 bg-cover"
                  : "h-8 w-8 bg-cover"
            }`}
            role="img"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
        </div>
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#637dff] to-[#9c4dff] text-sm font-black text-white shadow-[0_0_16px_rgba(99,125,255,0.3)]">
          {label}
        </div>
      )}
      {chainIconUrl && (
        <span
          aria-label={`Chain ${chainId}`}
          className="absolute -bottom-1 -right-1 h-[18px] w-[18px] rounded-full border-2 border-[#151922] bg-[#151922] bg-cover bg-center shadow-sm"
          role="img"
          style={{ backgroundImage: `url(${chainIconUrl})` }}
        />
      )}
    </div>
  );
}

function countAmountInputChars(value: string): number {
  return Array.from(value).filter((char) => /[\d.]/.test(char)).length;
}

function getCaretPositionFromAmountCharCount(value: string, targetCount: number): number {
  if (targetCount <= 0) return 0;

  let seen = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (!/[\d.]/.test(value[index])) continue;
    seen += 1;
    if (seen >= targetCount) return index + 1;
  }

  return value.length;
}
