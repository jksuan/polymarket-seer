import { useLayoutEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Loader2,
  QrCode,
  Store,
  Wallet,
} from "lucide-react";
import QRCode from "react-qr-code";
import { POLYGON_CHAIN_ID } from "@/lib/constants";
import type { CreateDepositResponse } from "@/types/bridge";
import type { DepositAsset } from "./types";
import { sortVisibleAssets } from "./assets";
import { CONNECTED_LOW_BALANCE_USD, DEPOSIT_SINGLE_TX_CAP_USD, getConnectedMinDepositUsd, MAX_DEPOSIT_BALANCE_RATIO } from "./constants";
import { formatCompactBalance, formatUsdWithCommas, parseAmountUsd } from "./format";
import { TokenIcon } from "./shared-ui";
import { HomeStep as ConnectedHomeStep } from "./connected/HomeStep";
import { AssetStep as ConnectedAssetStep } from "./connected/AssetStep";
import { AmountStep as ConnectedAmountStep } from "./connected/AmountStep";
import { TransferStep as TransferCryptoStep } from "./transfer/TransferStep";

export function HomeStep({
  locale,
  showConnectedWalletOption,
  walletLabel,
  walletUsdLoading,
  walletUsd,
  onWallet,
  onTransfer,
}: {
  locale: string;
  /** 仅当用户已连接外部钱包（非 Privy 嵌入式）时展示 Connected 入口；邮箱或社交登录仅有嵌入式钱包时为 false */
  showConnectedWalletOption: boolean;
  walletLabel: string;
  walletUsdLoading: boolean;
  walletUsd: number;
  onWallet: () => void;
  onTransfer: () => void;
}) {
  return (
    <ConnectedHomeStep
      locale={locale}
      showConnectedWalletOption={showConnectedWalletOption}
      walletLabel={walletLabel}
      walletUsdLoading={walletUsdLoading}
      walletUsd={walletUsd}
      onWallet={onWallet}
      onTransfer={onTransfer}
    />
  );
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

      {showConnectedWalletOption && (
        <section>
          <p className="mb-2 text-sm font-bold text-white/45">Connected</p>
          <button
            onClick={onWallet}
            disabled={walletUsdLoading}
            className={`flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all ${
              walletUsdLoading ? "cursor-not-allowed opacity-70" : "active:scale-[0.98] hover:bg-white/[0.06]"
            }`}
          >
            <div className="flex items-center gap-3">
              <Wallet className="text-white/70" size={24} />
              <div>
                <p className="text-sm font-black text-white">{walletLabel}</p>
                <p className="text-xs text-white/40">
                  {walletUsdLoading ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 className="animate-spin" size={12} />
                      {locale === "zh" ? "更新余额 ..." : "Updating balance ..."}
                    </span>
                  ) : (
                    <>
                      ${walletUsd.toFixed(2)} {"•"} {locale === "zh" ? "即时" : "Instant"}
                    </>
                  )}
                </p>
              </div>
            </div>
            <ArrowRight className="text-white/30" size={18} />
          </button>
        </section>
      )}

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
  return (
    <ConnectedAssetStep
      assets={assets}
      assetsLoading={assetsLoading}
      locale={locale}
      onSelect={onSelect}
    />
  );
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
        const isBelowMinUsd = usdValue < CONNECTED_LOW_BALANCE_USD;
        const isSelectable = balance > 0 && !isBelowMinUsd;
        return (
          <button
            key={asset.id}
            type="button"
            disabled={!isSelectable}
            onClick={() => onSelect(asset)}
            className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all ${
              isSelectable
                ? "border-white/30 bg-white/[0.04] active:scale-[0.98] hover:bg-white/[0.07]"
                : "cursor-not-allowed border-white/10 bg-white/[0.02] opacity-50"
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
              {isLow && (
                <p className="text-xs text-white/25">
                  {locale === "zh" ? "余额过低" : "Low Balance"}
                </p>
              )}
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
  return (
    <ConnectedAmountStep
      amountUsd={amountUsd}
      asset={asset}
      error={error}
      isQuoting={isQuoting}
      locale={locale}
      onAmountBlur={onAmountBlur}
      onAmountChange={onAmountChange}
      onContinue={onContinue}
      onPercent={onPercent}
    />
  );
  const amountNumber = parseAmountUsd(amountUsd);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaretCountRef = useRef<number | null>(null);
  const balanceMaxDepositUsd = Number(asset.usdValue ?? 0) * MAX_DEPOSIT_BALANCE_RATIO;
  const maxDepositUsd = Math.min(balanceMaxDepositUsd, DEPOSIT_SINGLE_TX_CAP_USD);
  const minDepositUsd = getConnectedMinDepositUsd(asset.minCheckoutUsd);
  const isAmountTooLow = amountNumber < minDepositUsd;
  const isAmountOverSingleTxCap = amountNumber > DEPOSIT_SINGLE_TX_CAP_USD + 0.01;
  const isAmountOverBalance = amountNumber > maxDepositUsd + 0.01;
  const amountWarning = isAmountTooLow
    ? locale === "zh" ? `最低充值金额${formatUsdWithCommas(minDepositUsd)}` : `${formatUsdWithCommas(minDepositUsd)} minimum deposit`
    : isAmountOverSingleTxCap
      ? locale === "zh"
        ? `单笔最高充值${formatUsdWithCommas(DEPOSIT_SINGLE_TX_CAP_USD)}，请分笔充值`
        : `Single deposit limit is ${formatUsdWithCommas(DEPOSIT_SINGLE_TX_CAP_USD)}. Please split your deposit.`
      : isAmountOverBalance
      ? locale === "zh" ? "钱包余额不足" : "Insufficient balance"
      : "";
  const amountInputWidth = `${Math.max(amountUsd.length || 1, 1)}ch`;
  const amountDisplayLength = Math.max((amountUsd || "0").length + 1, 2);
  const amountFontSizeRem = Math.max(1.75, Math.min(3, 3 - Math.max(0, amountDisplayLength - 7) * 0.12));
  const amountFontSize = `${amountFontSizeRem}rem`;

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
    <div className="flex min-h-[clamp(420px,65dvh,520px)] flex-col justify-between">
      <div>
        <div className="mt-10 flex justify-center px-2">
          <div
            className="inline-flex max-w-full items-center justify-center font-black leading-none text-white"
            style={{ fontSize: amountFontSize }}
          >
            <span>$</span>
            <input
              ref={inputRef}
              value={amountUsd}
              onBlur={onAmountBlur}
              onChange={handleInputChange}
              placeholder="0"
              style={{ width: amountInputWidth, fontSize: "inherit" }}
              className="min-w-[1ch] max-w-[calc(100%-1ch)] bg-transparent text-left font-black leading-none text-white outline-none placeholder:text-white/35"
              inputMode="decimal"
            />
          </div>
        </div>
        <div className="mb-10 mt-10 flex justify-center gap-3">
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

export { ConfirmStep } from "./confirm/ConfirmStep";

export function TransferStep({
  assets,
  chainOptions,
  copied,
  depositResponse,
  error,
  isCreating,
  locale,
  onAssetChange,
  onChainChange,
  onCopy,
  onCreate,
  selectedAssetId,
  selectedChainId,
  statusText,
  transferAddress,
}: {
  assets: DepositAsset[];
  chainOptions: { chainId: string; chainName: string }[];
  copied: boolean;
  depositResponse: CreateDepositResponse | null;
  error: string;
  isCreating: boolean;
  locale: string;
  onAssetChange: (assetId: string) => void;
  onChainChange: (chainId: string) => void;
  onCopy: (value: string) => void;
  onCreate: () => void;
  selectedAssetId: string;
  selectedChainId: string;
  statusText: string;
  transferAddress: string;
}) {
  return (
    <TransferCryptoStep
      assets={assets}
      chainOptions={chainOptions}
      copied={copied}
      depositResponse={depositResponse}
      error={error}
      isCreating={isCreating}
      locale={locale}
      onAssetChange={onAssetChange}
      onChainChange={onChainChange}
      onCopy={onCopy}
      onCreate={onCreate}
      selectedAssetId={selectedAssetId}
      selectedChainId={selectedChainId}
      statusText={statusText}
      transferAddress={transferAddress}
    />
  );
  const note = typeof depositResponse?.note === "string" ? (depositResponse?.note as string) : "";
  const [tokenOpen, setTokenOpen] = useState(false);
  const [chainOpen, setChainOpen] = useState(false);
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? assets[0];
  const selectedChain = chainOptions.find((chain) => chain.chainId === selectedChainId) ?? chainOptions[0];
  const filteredAssets = assets.filter((asset) => asset.chainId === selectedChainId);
  const minDepositUsd = Number(selectedAsset?.minCheckoutUsd ?? 10);
  const minDepositText = Number.isFinite(minDepositUsd) && minDepositUsd > 0
    ? `$${minDepositUsd.toFixed(0)}`
    : "$10";
  const supportedAssetSymbols = filteredAssets.length > 0
    ? filteredAssets.map((asset) => asset.symbol).join(" / ")
    : "ETH / USDC / USDC.e / POL";

  const toggleTokenOpen = () => {
    setTokenOpen((prev) => !prev);
    setChainOpen(false);
  };

  const toggleChainOpen = () => {
    setChainOpen((prev) => !prev);
    setTokenOpen(false);
  };

  const handleSelectChain = (chainId: string) => {
    onChainChange(chainId);
    setChainOpen(false);
  };

  const handleSelectAsset = (assetId: string) => {
    onAssetChange(assetId);
    setTokenOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <p className="mb-2 text-sm font-bold text-white/85">{locale === "zh" ? "代币" : "Tokens"}</p>
          <button
            type="button"
            onClick={toggleTokenOpen}
            className="flex h-11 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-left"
          >
            <span className="flex items-center gap-2">
              {selectedAsset ? (
                <TokenIcon compact chainId={selectedAsset.chainId} iconUrl={selectedAsset.iconUrl} symbol={selectedAsset.symbol} />
              ) : null}
              <span className="text-sm font-black text-white">{selectedAsset?.symbol ?? "--"}</span>
            </span>
            <ChevronDown className="text-white/40" size={16} />
          </button>
          {tokenOpen && (
            <div className="absolute left-0 right-0 top-[72px] z-20 max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1118] p-2 shadow-2xl">
              {(filteredAssets.length > 0 ? filteredAssets : assets).map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => handleSelectAsset(asset.id)}
                  className="flex w-full items-center justify-between rounded-xl px-2 py-2 hover:bg-white/5"
                >
                  <span className="flex items-center gap-2">
                    <TokenIcon compact chainId={asset.chainId} iconUrl={asset.iconUrl} symbol={asset.symbol} />
                    <span className="text-sm font-semibold text-white">{asset.symbol}</span>
                  </span>
                  {selectedAssetId === asset.id ? <Check className="text-white" size={14} /> : null}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <p className="mb-2 text-sm font-bold text-white/85">{locale === "zh" ? "网络" : "Chains"}</p>
          <button
            type="button"
            onClick={toggleChainOpen}
            className="flex h-11 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-left"
          >
            <span className="text-sm font-black text-white">{selectedChain?.chainName ?? "--"}</span>
            <ChevronDown className="text-white/40" size={16} />
          </button>
          {chainOpen && (
            <div className="absolute left-0 right-0 top-[72px] z-20 rounded-2xl border border-white/10 bg-[#0d1118] p-2 shadow-2xl">
              {chainOptions.map((chain) => (
                <button
                  key={chain.chainId}
                  type="button"
                  onClick={() => handleSelectChain(chain.chainId)}
                  className="flex w-full items-center justify-between rounded-xl px-2 py-2 hover:bg-white/5"
                >
                  <span className="text-sm font-semibold text-white">{chain.chainName}</span>
                  {selectedChainId === chain.chainId ? <Check className="text-white" size={14} /> : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="flex gap-3 rounded-2xl border border-[#ff6b6b]/20 bg-[#ff6b6b]/10 p-4">
          <AlertTriangle className="mt-0.5 shrink-0 text-[#ff6b6b]" size={18} />
          <p className="text-xs leading-relaxed text-[#ffcad4]/80">{error}</p>
        </div>
      )}

      {transferAddress && (
        <>
          <div className="flex flex-col items-center rounded-3xl border border-white/10 bg-white/[0.03] p-6">
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

          <button
            onClick={onCreate}
            disabled={isCreating}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-white active:scale-[0.98] disabled:opacity-50"
          >
            {isCreating ? <Loader2 className="animate-spin" size={16} /> : <QrCode size={16} />}
            {locale === "zh" ? "刷新收款地址" : "Refresh address"}
          </button>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white">{locale === "zh" ? "状态" : "Status"}</p>
              <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[10px] font-black uppercase text-white/60">
                {statusText}
              </span>
            </div>
            {note && <p className="mt-2 text-xs text-white/45">{note}</p>}
            <p className="mt-2 text-xs text-white/45">
              {locale === "zh"
                ? `最低入金 ${minDepositText}，支持资产 ${supportedAssetSymbols}`
                : `Min deposit ${minDepositText}, supported assets ${supportedAssetSymbols}`}
            </p>
          </div>
        </>
      )}

      {!transferAddress && (
        <button
          onClick={onCreate}
          disabled={isCreating}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#159bff] text-sm font-black text-white active:scale-[0.98] disabled:opacity-50"
        >
          {isCreating ? <Loader2 className="animate-spin" size={16} /> : <QrCode size={16} />}
          {locale === "zh" ? "生成收款地址" : "Create deposit address"}
        </button>
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
