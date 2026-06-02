"use client";

import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { usePolymarketAuth } from "@/contexts/PolymarketAuthContext";
import { upsertFundsUserWallet } from "@/lib/funds/client";

async function withAccessToken<T>(
  getAccessToken: () => Promise<string | null>,
  run: (token: string) => Promise<T>
): Promise<T | undefined> {
  try {
    const token = await getAccessToken();
    if (!token) return undefined;
    return await run(token);
  } catch (err) {
    console.warn("[user-wallet] sync failed:", err);
    return undefined;
  }
}

export function useUserWalletSync() {
  const { getAccessToken, authenticated } = usePrivy();
  const { proxyAddress, walletAddress, sessionMode } = usePolymarketAuth();
  const walletSyncedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authenticated || !proxyAddress || !walletAddress) return;
    const key = `${proxyAddress}:${walletAddress}`;
    if (walletSyncedKeyRef.current === key) return;
    walletSyncedKeyRef.current = key;

    void withAccessToken(getAccessToken, async (token) => {
      await upsertFundsUserWallet(token, {
        signerAddress: walletAddress,
        proxyAddress,
        sessionMode: sessionMode ?? null,
      });
    });
  }, [authenticated, getAccessToken, proxyAddress, sessionMode, walletAddress]);
}
