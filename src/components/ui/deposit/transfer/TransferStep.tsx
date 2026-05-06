import { useState } from "react";
import type { CreateDepositResponse } from "@/types/bridge";
import type { DepositAsset } from "../types";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Loader2,
  QrCode,
} from "lucide-react";
import QRCode from "react-qr-code";
import { TokenIcon } from "../shared-ui";

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
  const note = typeof depositResponse?.note === "string" ? depositResponse.note : "";
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
              {copied ? (
                <CheckCircle2 className="text-green-400" size={18} />
              ) : (
                <Copy className="text-white/60" size={18} />
              )}
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
              {locale === "zh" ? `最低入金 ${minDepositText}，支持资产 ${supportedAssetSymbols}` : `Min deposit ${minDepositText}, supported assets ${supportedAssetSymbols}`}
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

