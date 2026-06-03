"use client";

import { useCallback, useMemo } from "react";
import { motion } from "motion/react";
import { usePrivy } from "@privy-io/react-auth";
import { GlassCard } from "./components/GlassCard";
import { ProfileEmptyState } from "./components/ProfileEmptyState";
import { ProfileTransactionSkeleton } from "./components/ProfileTransactionSkeleton";
import { usePolymarketAuth } from "@/contexts/PolymarketAuthContext";
import { useTranslation } from "@/i18n";
import { listFundsMovementsLive } from "@/lib/funds/client";
import { useProfileFunds } from "./useProfileFunds";

export interface ProfileFundsProps {
  isActive: boolean;
}

export function ProfileFunds({ isActive }: ProfileFundsProps) {
  const { t } = useTranslation();
  const { getAccessToken, ready, authenticated } = usePrivy();
  const { proxyAddress } = usePolymarketAuth();
  const fetchReady = ready && authenticated && Boolean(proxyAddress);

  const labels = useMemo(
    () => ({
      txDeposit: t.profile.txDeposit,
      txWithdraw: t.profile.txWithdraw,
    }),
    [t.profile.txDeposit, t.profile.txWithdraw]
  );

  const fetchMovements = useCallback(async () => {
    if (!proxyAddress) return [];
    const token = await getAccessToken();
    if (!token) return [];
    const data = await listFundsMovementsLive(token, proxyAddress);
    return data.items;
  }, [getAccessToken, proxyAddress]);

  const { loading, rows, loadedOnce } = useProfileFunds({
    isActive,
    fetchReady,
    labels,
    fetchMovements,
  });

  const showSkeleton = isActive && loading && !loadedOnce;
  const showEmpty = loadedOnce && !loading && rows.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="flex flex-col gap-3"
    >
      {showSkeleton ? (
        <>
          <ProfileTransactionSkeleton />
          <ProfileTransactionSkeleton />
          <ProfileTransactionSkeleton />
        </>
      ) : showEmpty ? (
        <ProfileEmptyState loading={false} emptyText={t.profile.fundsEmpty} />
      ) : (
        rows.map((row) => (
          <GlassCard key={row.key} className="p-3 flex items-center gap-3">
            <div className="min-w-[42px] w-max shrink-0">
              <div
                className="text-[11px] font-bold py-1.5 px-1.5 rounded-md text-center whitespace-nowrap leading-none"
                style={{ color: row.txColor, background: row.txBg }}
              >
                {row.label}
              </div>
            </div>
            <div className="flex-1 min-w-0" />
            <div className="text-right shrink-0 min-w-[74px]">
              <div className="text-[15px] font-bold" style={{ color: row.amtColor }}>
                {row.amountDisplay}
              </div>
              <div className="text-[10px] text-[#a3aac4]/60 mt-0.5">{row.timeStr}</div>
            </div>
          </GlassCard>
        ))
      )}
    </motion.div>
  );
}
