import { useLayoutEffect, useRef } from "react";
import type { ChangeEvent } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { POLYGON_CHAIN_ID } from "@/lib/constants";
import { useTranslation } from "@/i18n";
import type { DepositAsset } from "../types";
import {
  CONNECTED_MAX_BUFFER_USD,
  DEPOSIT_SINGLE_TX_CAP_USD,
} from "../constants";
import { TokenIcon } from "../shared-ui";
import { formatUsdWithCommas, parseAmountUsd } from "../format";
import { getConnectedMaxAllowedUsd } from "../minimums";

// NOTE: AmountStep is a UI-only component. Sanitization happens in DepositDrawer.
export function AmountStep({
  amountUsd,
  asset,
  error,
  isQuoting,
  minDepositUsd,
  onAmountBlur,
  onAmountChange,
  onContinue,
  onPercent,
}: {
  amountUsd: string;
  asset: DepositAsset;
  error: string;
  isQuoting: boolean;
  minDepositUsd?: number;
  onAmountBlur: () => void;
  onAmountChange: (value: string) => void;
  onContinue: () => void;
  onPercent: (percent: number) => void;
}) {
  const { t, locale } = useTranslation();
  const df = t.depositFlow;
  const amountNumber = parseAmountUsd(amountUsd);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaretCountRef = useRef<number | null>(null);
  const maxDepositUsd = getConnectedMaxAllowedUsd({
    walletUsdValue: Number(asset.usdValue ?? 0),
    singleTxCapUsd: DEPOSIT_SINGLE_TX_CAP_USD,
    maxBufferUsd: CONNECTED_MAX_BUFFER_USD,
  });
  const effectiveMinDepositUsd = minDepositUsd ?? Math.max(asset.minCheckoutUsd ?? 1, 1) + 0.05;
  const isAmountTooLow = amountNumber < effectiveMinDepositUsd;
  const isAmountOverSingleTxCap = amountNumber > DEPOSIT_SINGLE_TX_CAP_USD + 0.01;
  const isAmountOverBalance = amountNumber > maxDepositUsd + 0.01;
  const amountWarning = isAmountTooLow
    ? locale === "zh"
      ? `最低充值金额${formatUsdWithCommas(effectiveMinDepositUsd)}`
      : `${formatUsdWithCommas(effectiveMinDepositUsd)} minimum deposit`
    : isAmountOverSingleTxCap
      ? locale === "zh"
        ? `单笔最高充值${formatUsdWithCommas(DEPOSIT_SINGLE_TX_CAP_USD)}，请分笔充值`
        : `Single deposit limit is ${formatUsdWithCommas(DEPOSIT_SINGLE_TX_CAP_USD)}. Please split your deposit.`
      : isAmountOverBalance
        ? locale === "zh"
          ? "钱包余额不足"
          : "Insufficient balance"
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
              {percent === 1 ? df.max : `${Math.round(percent * 100)}%`}
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
          <p className="mb-4 text-center text-xs font-semibold text-[#ffb25c]">{amountWarning}</p>
        )}
        <div className="mx-auto mb-7 flex w-fit items-center gap-4 rounded-full bg-white/10 px-4 py-3">
          <TokenIcon chainId={asset.chainId} iconUrl={asset.iconUrl} symbol={asset.symbol} />
          <div>
            <p className="text-[10px] text-white/35">{df.youSend}</p>
            <p className="text-xs font-black text-white">{asset.symbol}</p>
          </div>
          <ArrowRight className="text-white/35" size={18} />
          <TokenIcon chainId={String(POLYGON_CHAIN_ID)} symbol="pUSD" />
          <div>
            <p className="text-[10px] text-white/35">{df.youReceive}</p>
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

