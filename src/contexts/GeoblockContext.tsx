"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { GeoblockApiResponse, GeoblockCheckErrorCode, GeoblockStatus } from "@/lib/geoblock/types";
import { evaluateGeoblockForOrder } from "@/lib/geoblock/orderGate";

const DEBOUNCE_MS = 5000;
const GEOBLOCK_API = "/api/geoblock";

const initialStatus: GeoblockStatus = {
  blocked: false,
  loading: true,
  error: null,
  checkedAt: null,
};

type GeoblockContextValue = {
  status: GeoblockStatus;
  /** True when geoblock API reports blocked or check failed (fail-closed). */
  orderBlocked: boolean;
  refresh: (options?: { force?: boolean }) => Promise<GeoblockStatus>;
  /** Force refresh before placing an order; returns latest status. */
  refreshBeforeOrder: () => Promise<GeoblockStatus>;
};

const GeoblockContext = createContext<GeoblockContextValue | null>(null);

async function fetchGeoblockFromProxy(): Promise<GeoblockStatus> {
  const res = await fetch(GEOBLOCK_API, { cache: "no-store" });
  if (!res.ok) {
    const code: GeoblockCheckErrorCode = "UPSTREAM_FAILED";
    return {
      blocked: false,
      loading: false,
      error: code,
      checkedAt: Date.now(),
    };
  }
  const data = (await res.json()) as GeoblockApiResponse & { error?: string };
  if (typeof data.blocked !== "boolean") {
    return {
      blocked: false,
      loading: false,
      error: "INVALID_RESPONSE",
      checkedAt: Date.now(),
    };
  }
  return {
    blocked: data.blocked,
    ip: data.ip,
    country: data.country,
    region: data.region,
    loading: false,
    error: null,
    checkedAt: Date.now(),
  };
}

export function GeoblockProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<GeoblockStatus>(initialStatus);
  const statusRef = useRef(status);
  statusRef.current = status;
  const lastFetchAt = useRef(0);
  const inFlight = useRef<Promise<GeoblockStatus> | null>(null);

  const refresh = useCallback(async (options?: { force?: boolean }) => {
    const force = options?.force === true;
    const now = Date.now();
    if (!force && now - lastFetchAt.current < DEBOUNCE_MS && statusRef.current.checkedAt !== null) {
      return statusRef.current;
    }
    if (inFlight.current) return inFlight.current;

    setStatus((prev) => ({ ...prev, loading: prev.checkedAt === null }));

    const task = fetchGeoblockFromProxy()
      .then((next) => {
        lastFetchAt.current = Date.now();
        setStatus(next);
        return next;
      })
      .finally(() => {
        inFlight.current = null;
      });

    inFlight.current = task;
    return task;
  }, []);

  const refreshBeforeOrder = useCallback(async () => refresh({ force: true }), [refresh]);

  useEffect(() => {
    void refresh({ force: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only bootstrap
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh({ force: false });
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const orderBlocked = useMemo(
    () => !evaluateGeoblockForOrder(status).allowed,
    [status]
  );

  const value = useMemo(
    () => ({ status, orderBlocked, refresh, refreshBeforeOrder }),
    [status, orderBlocked, refresh, refreshBeforeOrder]
  );

  return <GeoblockContext.Provider value={value}>{children}</GeoblockContext.Provider>;
}

export function useGeoblock(): GeoblockContextValue {
  const ctx = useContext(GeoblockContext);
  if (!ctx) {
    throw new Error("useGeoblock must be used within GeoblockProvider");
  }
  return ctx;
}
