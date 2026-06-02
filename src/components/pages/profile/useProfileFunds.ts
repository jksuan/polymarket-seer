"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FundsMovementListItem } from "@/types/funds";
import { mapFundsMovementList, type FundsMovementDisplayRow } from "@/lib/funds/mapFundsMovementDisplay";

export type ProfileFundsLabels = {
  txDeposit: string;
  txWithdraw: string;
};

export async function loadProfileFundsRows(
  fetchMovements: () => Promise<FundsMovementListItem[]>,
  labels: ProfileFundsLabels
): Promise<FundsMovementDisplayRow[]> {
  const items = await fetchMovements();
  return mapFundsMovementList(items, labels);
}

export function useProfileFunds({
  isActive,
  labels,
  fetchMovements,
}: {
  isActive: boolean;
  labels: ProfileFundsLabels;
  fetchMovements: () => Promise<FundsMovementListItem[]>;
}) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<FundsMovementDisplayRow[]>([]);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const fetchMovementsRef = useRef(fetchMovements);
  const labelsRef = useRef(labels);
  fetchMovementsRef.current = fetchMovements;
  labelsRef.current = labels;

  const loadedOnceRef = useRef(false);

  useEffect(() => {
    if (!isActive) return;

    let cancelled = false;

    const run = async () => {
      if (!loadedOnceRef.current) {
        setLoading(true);
      }
      try {
        const next = await loadProfileFundsRows(
          () => fetchMovementsRef.current(),
          labelsRef.current
        );
        if (!cancelled) {
          setRows(next);
        }
      } catch {
        if (!cancelled) {
          setRows([]);
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
  }, [isActive]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRows(
        await loadProfileFundsRows(
          () => fetchMovementsRef.current(),
          labelsRef.current
        )
      );
    } catch {
      setRows([]);
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
