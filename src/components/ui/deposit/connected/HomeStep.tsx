import {
  ArrowRight,
  Loader2,
  QrCode,
  Store,
  Wallet,
} from "lucide-react";
import { useTranslation } from "@/i18n";

const TRANSFER_CHAIN_ICONS = [
  { src: "/images/crypto/eth.svg", alt: "Ethereum" },
  { src: "/images/crypto/op.svg", alt: "Optimism" },
  { src: "/images/crypto/bnb.svg", alt: "BNB Chain" },
  { src: "/images/crypto/pol.svg", alt: "Polygon" },
  { src: "/images/crypto/base.svg", alt: "Base" },
  { src: "/images/crypto/arb.svg", alt: "Arbitrum" },
  { src: "/images/crypto/sol.png", alt: "Solana" },
  { src: "/images/crypto/bitcoin.svg", alt: "Bitcoin" },
  { src: "/images/crypto/tron.png", alt: "Tron" },
  { src: "/images/crypto/hype.svg", alt: "HyperEVM" },
  { src: "/images/crypto/mon.svg", alt: "Monad" },
] as const;

export function HomeStep({
  showConnectedWalletOption,
  walletLabel,
  walletUsdLoading,
  walletUsd,
  fundsTermsLinkLabel,
  onOpenFundsTerms,
  onWallet,
  onTransfer,
}: {
  showConnectedWalletOption: boolean;
  walletLabel: string;
  walletUsdLoading: boolean;
  walletUsd: number;
  fundsTermsLinkLabel?: string;
  onOpenFundsTerms?: () => void;
  onWallet: () => void;
  onTransfer: () => void;
}) {
  const { t } = useTranslation();
  const df = t.depositFlow;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-black/20 p-1">
        <div className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-3 text-sm font-black text-white">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-black">{"₿"}</span>
          {df.useCrypto}
        </div>
        <div className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-black text-white/30">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">$</span>
          {df.useCash}
        </div>
      </div>

      {showConnectedWalletOption && (
        <section>
          <p className="mb-2 text-sm font-bold text-white/45">{df.connectedHeading}</p>
          <button
            type="button"
            onClick={onWallet}
            disabled={walletUsdLoading}
            className={`flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all ${
              walletUsdLoading ? "cursor-not-allowed opacity-70" : "active:scale-[0.98] hover:bg-white/[0.06]"
            }`}
          >
            <div className="flex items-center gap-3">
              <Wallet className="text-white/70" size={24} />
              <div>
                <p className="text-sm font-black text-white">{walletLabel}</p>
                <p className="text-xs text-white/40">
                  {walletUsdLoading ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 className="animate-spin" size={12} />
                      {df.updatingBalance}
                    </span>
                  ) : (
                    <>
                      ${walletUsd.toFixed(2)} {"•"} {df.instant}
                    </>
                  )}
                </p>
              </div>
            </div>
            <ArrowRight className="text-white/30" size={18} />
          </button>
        </section>
      )}

      <section>
        <p className="mb-2 text-sm font-bold text-white/45">{df.otherOptionsHeading}</p>
        <button
          type="button"
          onClick={onTransfer}
          className="mb-2 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all active:scale-[0.98] hover:bg-white/[0.06]"
        >
          <div className="flex items-center gap-3">
            <QrCode className="text-white/70" size={24} />
            <div>
              <p className="text-sm font-black text-white">{df.transferCrypto}</p>
              <p className="text-xs text-white/40">{df.transferSub}</p>
            </div>
          </div>
          <span
            className="flex items-center justify-end"
            aria-label={df.chainsAriaLabel}
          >
            {TRANSFER_CHAIN_ICONS.map((icon) => (
              <span
                key={icon.src}
                title={icon.alt}
                className="-ml-[1px] inline-flex h-3.5 w-3.5 items-center justify-center overflow-hidden rounded-full ring-1 ring-[#0e1422]"
              >
                <img src={icon.src} alt={icon.alt} className="h-full w-full object-cover" />
              </span>
            ))}
          </span>
        </button>
        <div className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4 opacity-50">
          <div className="flex items-center gap-3">
            <Store className="text-white/70" size={24} />
            <div>
              <p className="text-sm font-black text-white">{df.connectExchange}</p>
              <p className="text-xs text-white/40">{df.notSupportedYet}</p>
            </div>
          </div>
        </div>
      </section>

      {fundsTermsLinkLabel && onOpenFundsTerms ? (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={onOpenFundsTerms}
            className="text-[11px] font-semibold text-[#5eb8ff] underline decoration-white/20 underline-offset-2 hover:text-white/90"
          >
            {fundsTermsLinkLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
