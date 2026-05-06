import { Loader2 } from "lucide-react";
import type { DepositAsset } from "../types";

import { CONNECTED_LOW_BALANCE_USD } from "../constants";
import { formatCompactBalance } from "../format";
import { sortVisibleAssets } from "../assets";
import { TokenIcon } from "../shared-ui";

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
                <p className="text-xs text-white/25">{locale === "zh" ? "余额过低" : "Low Balance"}</p>
              )}
              <p className="text-sm font-black text-white/80">${(asset.usdValue ?? 0).toFixed(2)}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

