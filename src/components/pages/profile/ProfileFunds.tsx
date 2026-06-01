"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { GlassCard } from "./components/GlassCard";
import { ProfileEmptyState } from "./components/ProfileEmptyState";
import { ProfileTransactionSkeleton } from "./components/ProfileTransactionSkeleton";
import { useTranslation } from "@/i18n";
import { useProfileFunds } from "./useProfileFunds";
import type { FundsPersistenceApi } from "@/hooks/useFundsPersistence";

export interface ProfileFundsProps {
  isActive: boolean;
  fundsPersistence: Pick<FundsPersistenceApi, "fetchMovements">;
}

export function ProfileFunds({ isActive, fundsPersistence }: ProfileFundsProps) {
  const { t } = useTranslation();
  const labels = useMemo(
    () => ({
      txDeposit: t.profile.txDeposit,
      txWithdraw: t.profile.txWithdraw,
    }),
    [t.profile.txDeposit, t.profile.txWithdraw]
  );
  const { loading, rows, loadedOnce } = useProfileFunds({
    isActive,
    labels,
    fetchMovements: fundsPersistence.fetchMovements,
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
            <div className="w-[42px] shrink-0">
              <div
                className="text-[11px] font-bold py-1.5 rounded-md text-center w-full leading-none"
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
