"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { resolveChainIconUrl, resolveTokenIconUrl } from "@/components/ui/deposit/icons";
import { TokenIcon } from "@/components/ui/deposit/shared-ui";
import type { WithdrawDestinationAsset } from "./types";
import { normalizeWithdrawTokenSymbol } from "./withdrawWhitelist";

type ChainOption = { chainId: string; chainName: string };

const PICKER_MENU_CLASS =
  "absolute bottom-full left-0 right-0 z-20 mb-1 max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1118] p-2 shadow-2xl";

export function WithdrawAssetPickers({
  assetsLoading,
  chainOptions,
  onChainChange,
  onTokenChange,
  receiveChainLabel,
  receiveTokenLabel,
  selectedChainId,
  selectedTokenOptionId,
  tokenOptions,
}: {
  assetsLoading: boolean;
  chainOptions: ChainOption[];
  onChainChange: (chainId: string) => void;
  onTokenChange: (assetId: string) => void;
  receiveChainLabel: string;
  receiveTokenLabel: string;
  selectedChainId: string;
  selectedTokenOptionId: string;
  tokenOptions: WithdrawDestinationAsset[];
}) {
  const [tokenOpen, setTokenOpen] = useState(false);
  const [chainOpen, setChainOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const tokenDisabled = assetsLoading || tokenOptions.length === 0;
  const chainDisabled = assetsLoading || chainOptions.length === 0;

  const selectedTokenOption =
    tokenOptions.find((asset) => asset.id === selectedTokenOptionId) ?? tokenOptions[0];

  const selectedChain =
    chainOptions.find((chain) => chain.chainId === selectedChainId) ??
    (chainOptions.length > 0 ? chainOptions[0] : undefined);

  const effectiveChainId = selectedChain?.chainId ?? "";
  const effectiveChainName = selectedChain?.chainName ?? "";

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
    return () => document.removeEventListener("mousedown", handlePointerDownOutside);
  }, []);

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

  return (
    <div ref={rootRef} className="grid grid-cols-2 gap-3">
      <div>
        <p className="mb-2 text-xs font-bold text-white/45">{receiveTokenLabel}</p>
        <div className="relative">
        <button
          type="button"
          data-testid="withdraw-token-trigger"
          onClick={toggleTokenOpen}
          disabled={tokenDisabled}
          className="flex h-11 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex min-w-0 items-center gap-2">
            {selectedTokenOption ? (
              <TokenIcon
                compact
                iconUrl={resolveTokenIconUrl(
                  selectedTokenOption.symbol,
                  selectedTokenOption.iconUrl
                )}
                symbol={selectedTokenOption.symbol}
              />
            ) : null}
            <span className="truncate text-sm font-black text-white">
              {tokenDisabled ? "—" : (selectedTokenOption?.symbol ?? "—")}
            </span>
          </span>
          <ChevronDown
            className={`shrink-0 text-white/40 transition-transform duration-150 ${tokenOpen ? "rotate-180" : ""}`}
            size={16}
          />
        </button>
        {tokenOpen ? (
          <div
            data-testid="withdraw-token-menu"
            className={PICKER_MENU_CLASS}
          >
            {tokenOptions.map((asset) => {
              const isSelected =
                normalizeWithdrawTokenSymbol(selectedTokenOption?.symbol ?? "") ===
                normalizeWithdrawTokenSymbol(asset.symbol);
              return (
                <button
                  key={asset.id}
                  type="button"
                  data-testid="withdraw-token-option"
                  data-token-symbol={asset.symbol}
                  onClick={() => {
                    onTokenChange(asset.id);
                    setTokenOpen(false);
                    setChainOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-2 py-2 hover:bg-white/5"
                >
                  <span className="flex items-center gap-2">
                    <TokenIcon
                      compact
                      iconUrl={resolveTokenIconUrl(asset.symbol, asset.iconUrl)}
                      symbol={asset.symbol}
                    />
                    <span className="text-[0.82rem] font-normal text-white">{asset.symbol}</span>
                  </span>
                  {isSelected ? <Check className="text-white" size={14} /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold text-white/45">{receiveChainLabel}</p>
        <div className="relative">
        <button
          type="button"
          data-testid="withdraw-chain-trigger"
          onClick={toggleChainOpen}
          disabled={chainDisabled}
          className="flex h-11 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex min-w-0 items-center gap-2">
            <ChainIcon chainId={effectiveChainId} chainName={effectiveChainName} />
            <span className="truncate text-sm font-black text-white">
              {chainDisabled ? "—" : (effectiveChainName || "—")}
            </span>
          </span>
          <ChevronDown
            className={`shrink-0 text-white/40 transition-transform duration-150 ${chainOpen ? "rotate-180" : ""}`}
            size={16}
          />
        </button>
        {chainOpen ? (
          <div
            data-testid="withdraw-chain-menu"
            className={PICKER_MENU_CLASS}
          >
            {chainOptions.map((chain) => (
              <button
                key={chain.chainId}
                type="button"
                data-testid="withdraw-chain-option"
                data-chain-name={chain.chainName}
                onClick={() => {
                  onChainChange(chain.chainId);
                  setChainOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-white/5"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <ChainIcon chainId={chain.chainId} chainName={chain.chainName} />
                  <p className="truncate text-[0.82rem] font-normal text-white">{chain.chainName}</p>
                </div>
                {selectedChainId === chain.chainId ? (
                  <Check className="shrink-0 text-white" size={14} />
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
        </div>
      </div>
    </div>
  );
}

const CHAIN_ICON_SIZE_CLASS = "h-5 w-5";

function ChainIcon({ chainId, chainName }: { chainId?: string; chainName?: string }) {
  const iconUrl = resolveChainIconUrl(chainId, chainName);
  if (iconUrl) {
    return (
      <span
        aria-hidden="true"
        className={`${CHAIN_ICON_SIZE_CLASS} shrink-0 rounded-full bg-cover bg-center bg-no-repeat`}
        style={{ backgroundImage: `url(${iconUrl})` }}
      />
    );
  }

  const initial = (chainName || "?").slice(0, 1).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`flex ${CHAIN_ICON_SIZE_CLASS} shrink-0 items-center justify-center rounded-full bg-white/20 text-[8px] font-bold leading-none text-white/90`}
    >
      {initial}
    </span>
  );
}