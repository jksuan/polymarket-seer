"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FundsMovementListItem } from "@/types/funds";
import { mapFundsMovementList, type FundsMovementDisplayRow } from "@/lib/funds/mapFundsMovementDisplay";

export type ProfileFundsLabels = {
  txDeposit: string;
  txWithdraw: string;
};

/** 展示行由 items + 当前 labels 派生（与明细 Tab 的 useMemo(trades, t) 一致）。 */
export function deriveProfileFundsRows(
  items: FundsMovementListItem[],
  labels: ProfileFundsLabels
): FundsMovementDisplayRow[] {
  return mapFundsMovementList(items, labels);
}

export async function loadProfileFundsRows(
  fetchMovements: () => Promise<FundsMovementListItem[]>,
  labels: ProfileFundsLabels
): Promise<FundsMovementDisplayRow[]> {
  const items = await fetchMovements();
  return deriveProfileFundsRows(items, labels);
}

export function useProfileFunds({
  isActive,
  fetchReady,
  labels,
  fetchMovements,
}: {
  isActive: boolean;
  /** Privy 与 proxy 就绪后再请求，避免刷新后过早 return [] 被当成空列表 */
  fetchReady: boolean;
  labels: ProfileFundsLabels;
  fetchMovements: () => Promise<FundsMovementListItem[]>;
}) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<FundsMovementListItem[]>([]);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const fetchMovementsRef = useRef(fetchMovements);
  fetchMovementsRef.current = fetchMovements;

  const loadedOnceRef = useRef(false);

  const rows = useMemo(
    () => deriveProfileFundsRows(items, labels),
    [items, labels.txDeposit, labels.txWithdraw]
  );

  useEffect(() => {
    if (!isActive) return;

    if (!fetchReady) {
      setLoading(true);
      setLoadedOnce(false);
      loadedOnceRef.current = false;
      return;
    }

    let cancelled = false;

    const run = async () => {
      if (!loadedOnceRef.current) {
        setLoading(true);
      }
      try {
        const next = await fetchMovementsRef.current();
        if (!cancelled) {
          setItems(next);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          loadedOnceRef.current = true;
          setLoadedOnce(true);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isActive, fetchReady]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchMovementsRef.current());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      loadedOnceRef.current = true;
      setLoadedOnce(true);
    }
  }, []);

  return {
    loading,
    rows,
    loadedOnce,
    reload,
  };
}
