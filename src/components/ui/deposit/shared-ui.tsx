import type { ReactNode } from "react";
import { CHAIN_ICON_URLS, TOKEN_ICON_URLS } from "./constants";

export type InfoBoxRow =
  | [string, string]
  | { label: string; value: string; icon?: ReactNode };

export function InfoBox({ rows }: { rows: InfoBoxRow[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
      {rows.map((row, index) => {
        const label = Array.isArray(row) ? row[0] : row.label;
        const value = Array.isArray(row) ? row[1] : row.value;
        const icon = Array.isArray(row) ? undefined : row.icon;
        return (
          <div
            key={`${label}-${index}`}
            className={`flex items-center justify-between gap-3 px-3 py-2.5 text-xs ${
              index > 0 ? "border-t border-white/5" : ""
            }`}
          >
            <span className="shrink-0 text-white/40">{label}</span>
            <div className="flex min-w-0 max-w-[70%] items-center justify-end gap-2">
              {icon != null ? <span className="inline-flex shrink-0">{icon}</span> : null}
              <span className="min-w-0 truncate text-right font-normal text-white/90">{value}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TokenIcon({
  chainId,
  compact = false,
  iconUrl,
  symbol,
}: {
  chainId?: string;
  compact?: boolean;
  iconUrl?: string;
  symbol: string;
}) {
  const label = symbol.slice(0, 1).toUpperCase();
  const fallbackUrl = TOKEN_ICON_URLS[symbol.toUpperCase()];
  const imageUrl = iconUrl || fallbackUrl;
  const chainIconUrl = chainId ? CHAIN_ICON_URLS[chainId] : undefined;
  const isPolymarketUsd = symbol.toUpperCase() === "PUSD";

  const outerSize = compact ? "h-5 w-5" : "h-10 w-10";
  const innerPusd = compact ? "h-4 w-4" : "h-8 w-8";
  const innerToken = compact ? "h-5 w-5" : "h-10 w-10";
  const badgeClass = compact
    ? "absolute -bottom-px -right-px h-2.5 w-2.5 rounded-full border border-[#151922] bg-[#151922] bg-cover bg-center"
    : "absolute -bottom-1 -right-1 h-[18px] w-[18px] rounded-full border-2 border-[#151922] bg-[#151922] bg-cover bg-center";

  return (
    <div className={`relative shrink-0 ${outerSize}`}>
      {imageUrl ? (
        <div
          className={`flex ${outerSize} items-center justify-center rounded-full ${
            isPolymarketUsd ? "bg-[#2B5BED]" : "bg-transparent"
          }`}
        >
          <span
            aria-label={symbol}
            className={`rounded-full bg-center bg-no-repeat ${
              isPolymarketUsd ? `${innerPusd} bg-contain` : `${innerToken} bg-cover`
            }`}
            role="img"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
        </div>
      ) : (
        <div
          className={`flex ${outerSize} items-center justify-center rounded-full bg-gradient-to-br from-[#637dff] to-[#9c4dff] font-black text-white ${
            compact ? "text-[8px] leading-none" : "text-sm"
          }`}
        >
          {label}
        </div>
      )}
      {chainIconUrl && (
        <span
          aria-label={`Chain ${chainId}`}
          className={badgeClass}
          role="img"
          style={{ backgroundImage: `url(${chainIconUrl})` }}
        />
      )}
    </div>
  );
}
