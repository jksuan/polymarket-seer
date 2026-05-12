import { useTranslation } from "@/i18n";
import type { ExecutionSnapshot } from "../types";

export function WalletPromptBridge({
  snapshot,
  walletTotalText,
}: {
  snapshot: ExecutionSnapshot;
  walletTotalText: string;
}) {
  const { t } = useTranslation();

  if (snapshot.kind === "direct-transfer") {
    return null;
  }

  const text = snapshot.asset.isNative
    ? t.depositFlow.walletPromptFeeNote(walletTotalText)
    : t.depositFlow.walletPromptApproval;

  return (
    <div className="rounded-2xl bg-white/8 p-3 text-[11px] leading-relaxed text-white/60">
      {text}
    </div>
  );
}
