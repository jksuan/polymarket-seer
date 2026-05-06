import type { ExecutionSnapshot } from "../types";

export function WalletPromptBridge({
  locale,
  snapshot,
  walletTotalText,
}: {
  locale: string;
  snapshot: ExecutionSnapshot;
  walletTotalText: string;
}) {
  if (snapshot.kind === "direct-transfer") {
    return null;
  }

  const zh = locale === "zh";
  const text = snapshot.asset.isNative
    ? zh
      ? `You send 包含下方的 deBridge fixed fee，钱包弹窗可能显示 ${walletTotalText}。`
      : `You send includes the deBridge fixed fee below. Your wallet may prompt ${walletTotalText}.`
    : zh
      ? "钱包可能先要求授权，然后提交 deBridge 交易；最终签名金额以钱包弹窗为准。"
      : "Your wallet may ask for approval first, then submit the deBridge transaction. Confirm the final amount in your wallet prompt.";

  return (
    <div className="rounded-2xl bg-white/8 p-3 text-[11px] leading-relaxed text-white/60">
      {text}
    </div>
  );
}
