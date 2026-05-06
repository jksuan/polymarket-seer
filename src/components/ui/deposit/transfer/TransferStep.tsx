import { useState } from "react";
import type { DepositAsset } from "../types";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Loader2,
} from "lucide-react";
import QRCode from "react-qr-code";
import { TokenIcon } from "../shared-ui";

export function TransferStep({
  assets,
  chainOptions,
  copied,
  error,
  isCreating,
  locale,
  onAssetChange,
  onChainChange,
  onCopy,
  onCreate,
  onRetryPolling,
  selectedAssetId,
  selectedChainId,
  statusText,
  transferAddress,
}: {
  assets: DepositAsset[];
  chainOptions: { chainId: string; chainName: string }[];
  copied: boolean;
  error: string;
  isCreating: boolean;
  locale: string;
  onAssetChange: (assetId: string) => void;
  onChainChange: (chainId: string) => void;
  onCopy: (value: string) => void;
  onCreate: () => void;
  onRetryPolling?: () => void;
  selectedAssetId: string;
  selectedChainId: string;
  statusText: string;
  transferAddress: string;
}) {
  const [tokenOpen, setTokenOpen] = useState(false);
  const [chainOpen, setChainOpen] = useState(false);
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? assets[0];
  const selectedChain = chainOptions.find((chain) => chain.chainId === selectedChainId) ?? chainOptions[0];
  const filteredAssets = assets.filter((asset) => asset.chainId === selectedChainId);

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
          <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
            <p className="min-w-0 flex-1 text-xs leading-relaxed text-[#ffcad4]/80">{error}</p>
            {transferAddress && onRetryPolling && !isCreating ? (
              <button
                type="button"
                onClick={onRetryPolling}
                className="shrink-0 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-black text-white active:scale-[0.98]"
              >
                {locale === "zh" ? "重试检测" : "Retry"}
              </button>
            ) : null}
          </div>
        </div>
      )}

      {transferAddress && (
        <>
          <div className="flex flex-col items-center rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-5 rounded-2xl bg-white p-3">
              <QRCode value={transferAddress} size={160} viewBox="0 0 160 160" />
            </div>

            <div className="mb-3 flex w-full items-center justify-between">
              <p className="text-xs font-bold text-white/70">
                {locale === "zh" ? "收款地址" : "Your deposit address"}
              </p>
              <span className="text-[11px] font-semibold text-white/50">
                {locale === "zh" ? "条款适用" : "Terms apply"}
              </span>
            </div>

            <div className="w-full rounded-t-xl border border-b-0 border-white/10 bg-black/40 px-3 py-3 text-left">
              <span className="block break-all font-mono text-[11px] text-white">
                {transferAddress}
              </span>
            </div>
            <button
              onClick={() => onCopy(transferAddress)}
              className="flex w-full items-center justify-center gap-2 rounded-b-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-black text-white active:scale-[0.98]"
            >
              {copied ? (
                <CheckCircle2 className="text-green-400" size={14} />
              ) : (
                <Copy className="text-white/70" size={14} />
              )}
              {copied
                ? (locale === "zh" ? "已复制" : "Copied")
                : (locale === "zh" ? "复制地址" : "Copy address")}
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white">{locale === "zh" ? "状态" : "Status"}</p>
              <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[10px] font-black uppercase text-white/60">
                {statusText}
              </span>
            </div>
          </div>
        </>
      )}

      {!transferAddress && (
        <>
          {isCreating ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <Loader2 className="animate-spin text-white/60" size={22} />
              <p className="mt-3 text-xs font-semibold text-white/50">
                {locale === "zh" ? "正在生成收款地址..." : "Generating deposit address..."}
              </p>
            </div>
          ) : error ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-[#ff6b6b]/20 bg-[#ff6b6b]/10 p-6">
              <AlertTriangle className="text-[#ff6b6b]" size={22} />
              <p className="mt-3 text-xs font-semibold text-[#ffcad4]">
                {locale === "zh" ? "生成失败，请重试" : "Failed to generate. Please retry"}
              </p>
              <button
                type="button"
                onClick={onCreate}
                disabled={isCreating}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#159bff] text-sm font-black text-white active:scale-[0.98] disabled:opacity-50"
              >
                {locale === "zh" ? "重试生成" : "Retry"}
              </button>
            </div>
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <Loader2 className="animate-spin text-white/60" size={22} />
              <p className="mt-3 text-xs font-semibold text-white/50">
                {locale === "zh" ? "正在生成收款地址..." : "Generating deposit address..."}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

