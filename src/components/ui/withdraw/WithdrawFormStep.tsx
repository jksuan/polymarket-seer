"use client";

import { AlertTriangle, Loader2, Wallet } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { formatUsd } from "@/components/ui/deposit/format";
import { resolveChainIconUrl } from "@/components/ui/deposit/icons";
import { TokenIcon } from "@/components/ui/deposit/shared-ui";
import { useTranslation } from "@/i18n";
import { POLYGON_CHAIN_ID } from "./constants";
import { WithdrawFeedbackLine } from "./WithdrawFeedbackLine";
import type { useWithdrawDrawerController } from "./useWithdrawDrawerController";

type Controller = ReturnType<typeof useWithdrawDrawerController>;

export function WithdrawFormStep({ c }: { c: Controller }) {
  const { t } = useTranslation();
  const wf = t.withdrawFlow;
  const balanceDisplay = c.balanceNumber.toFixed(5);

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <label className="text-xs font-bold text-white/45">{wf.recipientLabel}</label>
        <WithdrawRecipientField
          error={c.recipientError}
          onChange={(value) => c.setRecipientAddr(value)}
          onUseConnected={c.handleUseConnected}
          showUseConnected={c.showUseConnected}
          useConnectedLabel={wf.useConnected}
          value={c.recipientAddr}
        />
        {c.recipientError ? (
          <p className="text-xs font-medium text-red-400">{c.recipientError}</p>
        ) : null}
      </section>

      <section className="space-y-2">
        <label className="text-xs font-bold text-white/45">{wf.amountLabel}</label>
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <input
            data-testid="withdraw-amount"
            type="text"
            inputMode="decimal"
            value={c.amountInput}
            onChange={(e) => c.handleAmountChange(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-2xl font-black text-white outline-none"
            placeholder="0"
          />
          <span className="text-sm font-bold text-white/40">{wf.currency}</span>
          <button
            type="button"
            onClick={c.handleMax}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-black text-white/70 hover:bg-white/10"
          >
            {t.common.max}
          </button>
        </div>
        {c.amountError ? (
          <p className="text-xs font-medium text-red-400">{c.amountError}</p>
        ) : null}
        <div className="flex items-center justify-between text-xs text-white/40">
          <span>{formatUsd(c.amountUsd)}</span>
          <span>{wf.balance(balanceDisplay)}</span>
        </div>
      </section>

      <section className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-white/45">{wf.receiveToken}</span>
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white">
            <TokenIcon
              compact
              iconUrl={c.selectedAsset.iconUrl}
              symbol={c.selectedAsset.symbol}
            />
            PUSD
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-white/45">{wf.receiveChain}</span>
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white">
            <WithdrawChainIcon chainId={String(POLYGON_CHAIN_ID)} chainName="Polygon" />
            Polygon
          </span>
        </div>
      </section>

      <p className="text-xs leading-relaxed text-white/50">
        {wf.pusdDirectHint}{" "}
        <a
          href={c.uniswapSwapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#ADFF2F] underline decoration-[#ADFF2F]/40 underline-offset-2 hover:decoration-[#ADFF2F]"
        >
          Uniswap
        </a>
        {wf.pusdDirectHintSuffix}
      </p>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-white/45">{wf.youWillReceive}</span>
        <span className="text-right text-sm font-bold text-white">
          {c.receiveAmountDisplay ? (
            <>
              {c.receiveAmountDisplay}{" "}
              <span className="text-white/45">{formatUsd(c.amountUsd)}</span>
            </>
          ) : (
            "—"
          )}
        </span>
      </div>

      {c.executionError ? (
        <p className="text-center text-xs font-medium text-red-400">{c.executionError}</p>
      ) : null}
      {c.withdrawFeedback ? <WithdrawFeedbackLine feedback={c.withdrawFeedback} /> : null}
      {c.statusMessage ? (
        <p className="text-center text-xs font-medium text-[#ADFF2F]">{c.statusMessage}</p>
      ) : null}
      {c.statusPollAlertMessage ? (
        <div className="flex gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4">
          <AlertTriangle className="mt-0.5 shrink-0 text-amber-300" size={18} />
          <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
            <p className="min-w-0 flex-1 text-xs leading-relaxed text-amber-100/85">
              {c.statusPollAlertMessage}
            </p>
            <button
              type="button"
              data-testid="withdraw-retry-status-poll"
              disabled={c.isRetryingStatusPoll}
              onClick={c.onRetryStatusPoll}
              className="shrink-0 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-black text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {c.isRetryingStatusPoll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                wf.retryStatusPoll
              )}
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        disabled={!c.canSubmit}
        onClick={() => void c.handleWithdraw()}
        className={`flex h-12 w-full items-center justify-center rounded-2xl text-sm font-black transition-all ${
          c.canSubmit
            ? "bg-[#2B5BED] text-white hover:bg-[#3d6ef5] active:scale-[0.98]"
            : "cursor-not-allowed bg-[#2B5BED]/40 text-white/50"
        }`}
      >
        {c.isExecuting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {wf.withdrawing}
          </span>
        ) : c.canSubmit ? (
          wf.withdraw
        ) : (
          wf.enterAmount
        )}
      </button>
    </div>
  );
}

function WithdrawChainIcon({ chainId, chainName }: { chainId?: string; chainName?: string }) {
  const iconUrl = resolveChainIconUrl(chainId, chainName);
  if (iconUrl) {
    return (
      <span
        aria-hidden="true"
        className="h-5 w-5 shrink-0 rounded-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${iconUrl})` }}
      />
    );
  }

  const initial = (chainName || "?").slice(0, 1).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-[8px] font-bold leading-none text-white/90"
    >
      {initial}
    </span>
  );
}

function WithdrawRecipientField({
  error,
  onChange,
  onUseConnected,
  showUseConnected,
  useConnectedLabel,
  value,
}: {
  error: string | null;
  onChange: (value: string) => void;
  onUseConnected: () => void;
  showUseConnected: boolean;
  useConnectedLabel: string;
  value: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const syncHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useLayoutEffect(() => {
    syncHeight();
  }, [value, showUseConnected]);

  return (
    <div
      className={`flex items-center gap-2 rounded-2xl border bg-white/[0.03] px-3 py-2.5 ${
        error ? "border-red-400/40" : "border-white/10"
      }`}
    >
      <textarea
        ref={textareaRef}
        data-testid="withdraw-recipient"
        value={value}
        rows={1}
        placeholder="0x..."
        onChange={(e) => {
          onChange(e.target.value);
          syncHeight();
        }}
        className="min-h-5 max-h-32 min-w-0 flex-1 resize-none overflow-hidden bg-transparent text-base font-medium leading-5 text-white break-all outline-none placeholder:text-white/25"
      />
      {showUseConnected ? (
        <button
          type="button"
          onClick={onUseConnected}
          className="flex shrink-0 items-center gap-1.5 self-center rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-white/80 hover:bg-white/10"
        >
          <Wallet size={12} />
          {useConnectedLabel}
        </button>
      ) : null}
    </div>
  );
}
