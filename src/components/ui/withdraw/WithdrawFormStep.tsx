"use client";

import { Loader2, Wallet } from "lucide-react";
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
        <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <textarea
            data-testid="withdraw-recipient"
            value={c.recipientAddr}
            onChange={(e) => c.setRecipientAddr(e.target.value)}
            rows={2}
            placeholder="0x…"
            className="min-h-[3.25rem] w-full resize-none bg-transparent text-sm font-medium text-white outline-none placeholder:text-white/25"
          />
          {c.showUseConnected ? (
            <button
              type="button"
              onClick={c.handleUseConnected}
              className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-white/80 hover:bg-white/10"
            >
              <Wallet size={12} />
              {wf.useConnected}
            </button>
          ) : null}
        </div>
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
