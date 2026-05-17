"use client";

import { Loader2, Wallet } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { formatUsd } from "@/components/ui/deposit/format";
import { WithdrawAssetPickers } from "./WithdrawAssetPickers";
import { useTranslation } from "@/i18n";
import { WithdrawBreakdown } from "./WithdrawBreakdown";
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
          onChange={c.setRecipientAddr}
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

      <WithdrawAssetPickers
        assetsLoading={c.assetsLoading}
        chainOptions={c.chainOptions}
        onChainChange={c.handleChainChange}
        onTokenChange={c.handleTokenChange}
        receiveChainLabel={wf.receiveChain}
        receiveTokenLabel={wf.receiveToken}
        selectedChainId={c.selectedChainId}
        selectedTokenOptionId={c.selectedTokenOptionId}
        tokenOptions={c.tokenOptions}
      />

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-white/45">{wf.youWillReceive}</span>
        <span className="text-right text-sm font-bold text-white">
          {c.isQuoting ? (
            <Loader2 className="ml-auto inline h-4 w-4 animate-spin" />
          ) : c.quote ? (
            <>
              {c.quote.receiveAmountDisplay}{" "}
              <span className="text-white/45">{formatUsd(c.quote.receiveUsd)}</span>
            </>
          ) : (
            "—"
          )}
        </span>
      </div>

      {c.quote?.fee ? <WithdrawBreakdown fee={c.quote.fee} /> : null}

      {c.quoteError ? (
        <p className="text-xs font-medium text-red-400">{c.quoteError}</p>
      ) : null}
      {c.executionError ? (
        <p className="text-xs font-medium text-red-400">{c.executionError}</p>
      ) : null}
      {c.statusMessage ? (
        <p className="text-xs font-medium text-[#ADFF2F]">{c.statusMessage}</p>
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
        className="min-h-5 max-h-32 min-w-0 flex-1 resize-none overflow-hidden bg-transparent text-sm font-medium leading-5 text-white break-all outline-none placeholder:text-white/25"
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
