import { useEffect, useRef, useState } from "react";
import type { DepositAsset } from "../types";
import {
  ArrowDown,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Loader2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import QRCode from "react-qr-code";
import { TokenIcon } from "../shared-ui";
import { getTransferChainMinUsd } from "../minimums";

const KNOWN_CHAIN_ICON_URLS: Record<string, string> = {
  "1": "/ethereum-eth.svg",
  "10": "https://assets.coingecko.com/coins/images/25244/small/Optimism.png",
  "56": "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  "137": "https://assets.coingecko.com/coins/images/32440/small/polygon.png",
  "8453": "https://assets.coingecko.com/coins/images/33079/small/base.png",
  "42161": "https://assets.coingecko.com/coins/images/16547/small/arb.jpg",
  solana: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  tron: "https://assets.coingecko.com/coins/images/1094/small/tron-logo.png",
  bitcoin: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  bsc: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
};

const LOCAL_TOKEN_ICON_BY_SYMBOL: Record<string, string> = {
  "1INCH": "/images/crypto/1inch.svg",
  AAVE: "/images/crypto/aave.svg",
  ARB: "/images/crypto/arb.svg",
  BASE: "/images/crypto/base.svg",
  BNB: "/images/crypto/bnb.svg",
  BUSD: "/images/crypto/busd.svg",
  BTC: "/images/crypto/bitcoin.svg",
  BITCOIN: "/images/crypto/bitcoin.svg",
  DAI: "/images/crypto/dai.svg",
  ETH: "/images/crypto/eth.svg",
  EUROC: "/images/crypto/euroc.png",
  HYPE: "/images/crypto/hype.svg",
  LINK: "/images/crypto/link.png",
  MATIC: "/images/crypto/matic.svg",
  MON: "/images/crypto/mon.svg",
  OP: "/images/crypto/op.svg",
  POL: "/images/crypto/pol.svg",
  SOL: "/images/crypto/sol.png",
  TUSD: "/images/crypto/tusd.svg",
  USDE: "/images/crypto/usde.svg",
  "USDC.E": "/images/crypto/usdc.svg",
  USDT: "/images/crypto/usdt.svg",
  WBNB: "/images/crypto/wbnb.svg",
  WETH: "/images/crypto/weth.png",
};

const LOCAL_CHAIN_ICON_BY_NAME: Record<string, string> = {
  ethereum: "/images/crypto/eth.svg",
  polygon: "/images/crypto/pol.svg",
  arbitrum: "/images/crypto/arb.svg",
  base: "/images/crypto/base.svg",
  optimism: "/images/crypto/op.svg",
  "bnb smart chain": "/images/crypto/bnb.svg",
  bsc: "/images/crypto/bnb.svg",
  solana: "/images/crypto/sol.png",
  bitcoin: "/images/crypto/bitcoin.svg",
  hyperevm: "/images/crypto/hype.svg",
  monad: "/images/crypto/mon.svg",
  tron: "/images/crypto/tron.png",
};

const LOCAL_CHAIN_ICON_BY_ID: Record<string, string> = {
  "1": "/images/crypto/eth.svg",
  "10": "/images/crypto/op.svg",
  "56": "/images/crypto/bnb.svg",
  "137": "/images/crypto/pol.svg",
  "8453": "/images/crypto/base.svg",
  "42161": "/images/crypto/arb.svg",
};

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
  statusCode,
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
  statusCode?: string;
  transferAddress: string;
}) {
  const [tokenOpen, setTokenOpen] = useState(false);
  const [chainOpen, setChainOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const tokenOptions = [...new Map(
    assets.map((asset) => [asset.symbol.trim().toUpperCase(), asset] as const)
  ).values()];
  const hasChains = chainOptions.length > 0;
  const selectedChain = chainOptions.find((chain) => chain.chainId === selectedChainId);
  const effectiveChainId = selectedChain?.chainId ?? (hasChains ? chainOptions[0].chainId : "");
  const effectiveChainName = selectedChain?.chainName ?? (hasChains ? chainOptions[0].chainName : "");
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? tokenOptions[0];
  const hasTokens = tokenOptions.length > 0;
  const selectedChainMinUsd = getTransferChainMinUsd(effectiveChainName, effectiveChainId, assets);
  const tokenDisabled = !hasTokens;
  const chainDisabled = !hasChains;
  const statusVisual = getTransferStatusVisual(locale, statusCode, statusText);

  const toggleTokenOpen = () => {
    if (tokenDisabled) return;
    setTokenOpen((prev) => !prev);
    setChainOpen(false);
  };

  const toggleChainOpen = () => {
    if (chainDisabled) return;
    setChainOpen((prev) => !prev);
    setTokenOpen(false);
  };

  const handleSelectChain = (chainId: string) => {
    onChainChange(chainId);
    setChainOpen(false);
  };

  const handleSelectAsset = (assetId: string) => {
    onAssetChange(assetId);
    setChainOpen(false);
    setTokenOpen(false);
  };

  useEffect(() => {
    const handlePointerDownOutside = (event: MouseEvent) => {
      const root = rootRef.current;
      if (!root) return;
      const target = event.target;
      if (target instanceof Node && root.contains(target)) return;
      setTokenOpen(false);
      setChainOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDownOutside);
    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside);
    };
  }, []);

  return (
    <div ref={rootRef} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <p className="mb-2 text-sm font-bold text-white/85">{locale === "zh" ? "代币" : "Tokens"}</p>
          <button
            type="button"
            onClick={toggleTokenOpen}
            disabled={tokenDisabled}
            className="flex h-11 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              {selectedAsset ? (
                <TokenIcon compact iconUrl={getTokenIconUrl(selectedAsset)} symbol={selectedAsset.symbol} />
              ) : null}
              <span className="text-sm font-black text-white">
                {tokenDisabled
                  ? (locale === "zh" ? "暂无可用代币" : "No tokens")
                  : (selectedAsset?.symbol ?? "--")}
              </span>
            </span>
            <ChevronDown
              className={`text-white/40 transition-transform duration-150 ${tokenOpen ? "rotate-180" : ""}`}
              size={16}
            />
          </button>
          {tokenOpen && (
            <div className="absolute left-0 right-0 top-[72px] z-20 max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1118] p-2 shadow-2xl">
              {tokenOptions.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => handleSelectAsset(asset.id)}
                  className="flex w-full items-center justify-between rounded-xl px-2 py-2 hover:bg-white/5"
                >
                  <span className="flex items-center gap-2">
                    <TokenIcon compact iconUrl={getTokenIconUrl(asset)} symbol={asset.symbol} />
                    <span className="text-[0.82rem] font-normal text-white">{asset.symbol}</span>
                  </span>
                  {selectedAsset?.symbol.trim().toUpperCase() === asset.symbol.trim().toUpperCase()
                    ? <Check className="text-white" size={14} />
                    : null}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-white/85">{locale === "zh" ? "网络" : "Chains"}</p>
            <p className="text-sm text-white/50">
              {chainDisabled
                ? (locale === "zh" ? "暂无可用网络" : "No networks")
                : (locale === "zh" ? `最低 $${selectedChainMinUsd}` : `Min $${selectedChainMinUsd}`)}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleChainOpen}
            disabled={chainDisabled}
            className="flex h-11 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex min-w-0 items-center gap-2">
              <ChainIcon chainId={effectiveChainId} chainName={effectiveChainName} />
              <span className="truncate text-sm font-black text-white">{effectiveChainName || "--"}</span>
            </span>
            <ChevronDown
              className={`text-white/40 transition-transform duration-150 ${chainOpen ? "rotate-180" : ""}`}
              size={16}
            />
          </button>
          {chainOpen && (
            <div className="absolute left-0 right-0 top-[72px] z-20 rounded-2xl border border-white/10 bg-[#0d1118] p-2 shadow-2xl">
              {chainOptions.map((chain) => (
                <button
                  key={chain.chainId}
                  type="button"
                  onClick={() => handleSelectChain(chain.chainId)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-white/5"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <ChainIcon chainId={chain.chainId} chainName={chain.chainName} />
                    <p className="truncate text-[0.82rem] font-normal text-white">{chain.chainName}</p>
                  </div>
                  <p className="shrink-0 text-[0.82rem] font-normal text-white/50">
                    {locale === "zh"
                      ? `最低 $${getTransferChainMinUsd(chain.chainName, chain.chainId, assets)}`
                      : `Min $${getTransferChainMinUsd(chain.chainName, chain.chainId, assets)}`}
                  </p>
                  {selectedChainId === chain.chainId ? <Check className="shrink-0 text-white" size={14} /> : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-white/55">
        {locale === "zh"
          ? "按所选代币与网络转账至下方地址；错链可能造成资金损失。转出后请耐心等待入账。"
          : "Use the selected token and network to send to the address below; wrong-chain transfers may cause loss of funds. After sending from your wallet, wait for the deposit to credit."}
      </p>

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
          <div className="flex flex-col items-center rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 rounded-[24px] border border-white/10 bg-gradient-to-b from-[#1a2334] to-[#121826] p-2 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
              <div className="relative rounded-[18px] bg-white p-2">
                <QRCode
                  bgColor="#FFFFFF"
                  fgColor="#0F172A"
                  level="H"
                  size={140}
                  value={transferAddress}
                  viewBox="0 0 140 140"
                />
                {selectedChain ? (
                  (() => {
                    const centerChainIcon = getChainIconUrl(selectedChain.chainName, selectedChain.chainId);
                    const centerChainInitial = (selectedChain.chainName || "?").slice(0, 1).toUpperCase();
                    return (
                  <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.22)]">
                    {centerChainIcon ? (
                      <span
                        aria-hidden="true"
                        className="h-5 w-5 rounded-full bg-cover bg-center bg-no-repeat"
                        style={{ backgroundImage: `url(${centerChainIcon})` }}
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EEF2FF] text-[10px] font-bold text-[#334155]"
                      >
                        {centerChainInitial}
                      </span>
                    )}
                  </span>
                    );
                  })()
                ) : null}
              </div>
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
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm font-bold text-white">{locale === "zh" ? "状态" : "Status"}</p>
              <div className="flex items-center gap-2">
                {statusVisual.phase === "processing" ? (
                  <span className="relative h-4 w-4 shrink-0">
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-[#22c55e]">
                      <ArrowDown className="text-white" size={10} strokeWidth={3} />
                    </span>
                    <span className="pointer-events-none absolute -inset-[5px] rounded-full border-[3px] border-dashed border-[#22c55e]/90 animate-spin" />
                  </span>
                ) : null}
                {statusVisual.phase === "completed" ? (
                  <motion.span
                    className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#22c55e]"
                    animate={{
                      scale: [1, 1.08, 1],
                      boxShadow: [
                        "0 0 0 rgba(34,197,94,0)",
                        "0 0 10px rgba(34,197,94,0.26)",
                        "0 0 6px rgba(34,197,94,0.16)",
                      ],
                    }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                  >
                    <Check className="text-white" size={10} strokeWidth={3} />
                  </motion.span>
                ) : null}
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={`status-text-${statusVisual.text}`}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="text-sm font-semibold text-white/80"
                  >
                    {statusVisual.text}
                  </motion.span>
                </AnimatePresence>
              </div>
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

function getChainIconUrl(chainName?: string, chainId?: string): string | undefined {
  const id = (chainId || "").trim();
  if (id && LOCAL_CHAIN_ICON_BY_ID[id]) return LOCAL_CHAIN_ICON_BY_ID[id];

  const normalized = (chainName || "").trim().toLowerCase();
  if (LOCAL_CHAIN_ICON_BY_NAME[normalized]) return LOCAL_CHAIN_ICON_BY_NAME[normalized];
  if (id && KNOWN_CHAIN_ICON_URLS[id]) return KNOWN_CHAIN_ICON_URLS[id];
  if (normalized.includes("bitcoin")) return KNOWN_CHAIN_ICON_URLS.bitcoin;
  if (normalized.includes("solana")) return KNOWN_CHAIN_ICON_URLS.solana;
  if (normalized.includes("tron")) return KNOWN_CHAIN_ICON_URLS.tron;
  if (normalized.includes("optimism")) return KNOWN_CHAIN_ICON_URLS["10"];
  if (normalized.includes("arbitrum")) return KNOWN_CHAIN_ICON_URLS["42161"];
  if (normalized.includes("base")) return KNOWN_CHAIN_ICON_URLS["8453"];
  if (normalized.includes("polygon")) return KNOWN_CHAIN_ICON_URLS["137"];
  if (normalized.includes("bnb") || normalized.includes("bsc")) return KNOWN_CHAIN_ICON_URLS.bsc;
  if (normalized.includes("ethereum")) return KNOWN_CHAIN_ICON_URLS["1"];
  if (normalized.includes("hyperevm")) return LOCAL_CHAIN_ICON_BY_NAME.hyperevm;
  if (normalized.includes("monad")) return LOCAL_CHAIN_ICON_BY_NAME.monad;
  return undefined;
}

function getTokenIconUrl(asset: DepositAsset): string | undefined {
  const symbol = asset.symbol.trim().toUpperCase();
  const fromMap = LOCAL_TOKEN_ICON_BY_SYMBOL[symbol];
  if (fromMap) return fromMap;
  if (asset.iconUrl) return asset.iconUrl;
  return undefined;
}

function ChainIcon({ chainId, chainName }: { chainId?: string; chainName?: string }) {
  const iconUrl = getChainIconUrl(chainName, chainId);
  if (iconUrl) {
    return (
      <span
        aria-hidden="true"
        className="h-4 w-4 shrink-0 rounded-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${iconUrl})` }}
      />
    );
  }

  const initial = (chainName || "?").slice(0, 1).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/20 text-[9px] font-bold text-white/90"
    >
      {initial}
    </span>
  );
}

function getTransferStatusVisual(
  locale: string,
  currentStatus?: string,
  fallback?: string
): { phase: "idle" | "processing" | "completed" | "other"; text: string } {
  const zh = locale === "zh";
  switch ((currentStatus || "").toUpperCase()) {
    case "DEPOSIT_DETECTED":
    case "PROCESSING":
      return { phase: "processing", text: zh ? "处理中..." : "Processing..." };
    case "ORIGIN_TX_CONFIRMED":
      return { phase: "processing", text: zh ? "处理中..." : "Processing..." };
    case "SUBMITTED":
      return { phase: "processing", text: zh ? "处理中..." : "Processing..." };
    case "COMPLETED":
      return { phase: "completed", text: zh ? "已入账" : "Deposited" };
    case "FAILED":
      return { phase: "other", text: zh ? "失败" : "Failed" };
    default:
      return { phase: "idle", text: fallback || (zh ? "等待转账" : "Waiting") };
  }
}

