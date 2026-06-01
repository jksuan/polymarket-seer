"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { usePolymarketAuth } from "@/contexts/PolymarketAuthContext";
import { getTransferTransactionsSinceAddressCreated } from "@/components/ui/deposit/status";
import { useBridgeStatus } from "@/hooks/useBridge";
import type { CreateDepositResponse } from "@/types/bridge";
import {
  listFundsMovements,
  recordFundsMovement,
  upsertFundsDepositBridges,
  upsertFundsUserWallet,
  upsertFundsWithdrawDestination,
} from "@/lib/funds/client";
import {
  buildDepositMovementDedupeKey,
  findLatestCompletedBridgeTx,
  resolveBridgeDepositAmountUsd,
} from "@/lib/funds/bridgeTxAmount";
import {
  clearPendingTransferDeposit,
  readPendingTransferDeposit,
} from "@/lib/funds/pendingTransferDeposit";
import {
  buildCompletedMovementPayload,
  buildDepositBridgesPayload,
} from "@/lib/funds/persistenceOps";
import type { BridgeTransaction } from "@/types/bridge";

type RecordDepositMovementParams = {
  amountUsd: number;
  bridgeStatusAddress?: string | null;
  txHash?: string | null;
  fromChainId?: string | null;
  toChainId?: string | null;
  fromTokenAddress?: string | null;
  toTokenAddress?: string | null;
  tokenSymbol?: string | null;
  tokenDecimals?: number | null;
  fromAmountBaseUnit?: string | null;
  rawBridgeTransaction?: BridgeTransaction | unknown;
};

async function withFundsToken<T>(
  getAccessToken: () => Promise<string | null>,
  run: (token: string) => Promise<T>
): Promise<T | undefined> {
  try {
    const token = await getAccessToken();
    if (!token) return undefined;
    return await run(token);
  } catch (err) {
    console.warn("[funds] persistence failed:", err);
    return undefined;
  }
}

export function useFundsPersistence() {
  const { getAccessToken, authenticated } = usePrivy();
  const { proxyAddress, walletAddress, sessionMode } = usePolymarketAuth();
  const walletSyncedKeyRef = useRef<string | null>(null);
  const depositMovementRecordedRef = useRef<string | null>(null);
  const withdrawRecordedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authenticated || !proxyAddress || !walletAddress) return;
    const key = `${proxyAddress}:${walletAddress}`;
    if (walletSyncedKeyRef.current === key) return;
    walletSyncedKeyRef.current = key;

    void withFundsToken(getAccessToken, async (token) => {
      await upsertFundsUserWallet(token, {
        signerAddress: walletAddress,
        proxyAddress,
        sessionMode: sessionMode ?? null,
      });
    });
  }, [authenticated, getAccessToken, proxyAddress, sessionMode, walletAddress]);

  const syncDepositBridges = useCallback(
    (response: CreateDepositResponse) => {
      if (!proxyAddress) return;
      void withFundsToken(getAccessToken, async (token) => {
        await upsertFundsDepositBridges(
          token,
          buildDepositBridgesPayload(proxyAddress, response)
        );
      });
    },
    [getAccessToken, proxyAddress]
  );

  const persistDepositMovement = useCallback(
    (params: RecordDepositMovementParams) => {
      if (!proxyAddress) return;
      if (!Number.isFinite(params.amountUsd) || params.amountUsd < 0) return;

      const dedupeKey = buildDepositMovementDedupeKey({
        bridgeStatusAddress: params.bridgeStatusAddress,
        txHash: params.txHash,
      });
      if (depositMovementRecordedRef.current === dedupeKey) return;
      depositMovementRecordedRef.current = dedupeKey;

      void withFundsToken(getAccessToken, async (token) => {
        await recordFundsMovement(
          token,
          buildCompletedMovementPayload({
            proxyAddress,
            movementType: "deposit",
            amountUsd: params.amountUsd,
            bridgeStatusAddress: params.bridgeStatusAddress,
            txHash: params.txHash,
            fromChainId: params.fromChainId,
            toChainId: params.toChainId,
            fromTokenAddress: params.fromTokenAddress,
            toTokenAddress: params.toTokenAddress,
            tokenSymbol: params.tokenSymbol,
            tokenDecimals: params.tokenDecimals,
            fromAmountBaseUnit: params.fromAmountBaseUnit,
            rawBridgeTransaction: params.rawBridgeTransaction,
          })
        );
        clearPendingTransferDeposit();
      });
    },
    [getAccessToken, proxyAddress]
  );

  const pendingTransfer = useMemo(() => {
    if (!authenticated || !proxyAddress) return null;
    const pending = readPendingTransferDeposit();
    if (!pending) return null;
    if (pending.proxyAddress.toLowerCase() !== proxyAddress.toLowerCase()) return null;
    return pending;
  }, [authenticated, proxyAddress]);

  const pendingBridgeStatus = useBridgeStatus(
    pendingTransfer?.bridgeStatusAddress,
    Boolean(pendingTransfer?.bridgeStatusAddress)
  );

  useEffect(() => {
    if (!pendingTransfer || !proxyAddress) return;
    const scoped = getTransferTransactionsSinceAddressCreated(
      pendingBridgeStatus.data?.transactions,
      pendingTransfer.addressCreatedAtMs
    );
    const tx = findLatestCompletedBridgeTx(scoped);
    if (!tx || String(tx.status ?? "").toUpperCase() !== "COMPLETED") return;

    persistDepositMovement({
      amountUsd: resolveBridgeDepositAmountUsd(tx),
      bridgeStatusAddress: pendingTransfer.bridgeStatusAddress,
      txHash: tx.txHash ?? null,
      fromChainId: tx.fromChainId ?? null,
      fromTokenAddress: tx.fromTokenAddress ?? null,
      toChainId: tx.toChainId ?? null,
      toTokenAddress: tx.toTokenAddress ?? null,
      fromAmountBaseUnit: tx.fromAmountBaseUnit ?? null,
      rawBridgeTransaction: tx,
    });
  }, [
    pendingBridgeStatus.data?.transactions,
    pendingTransfer,
    persistDepositMovement,
    proxyAddress,
  ]);

  const recordDepositComplete = useCallback(
    (params: RecordDepositMovementParams) => {
      persistDepositMovement(params);
    },
    [persistDepositMovement]
  );

  const recordTransferDepositComplete = useCallback(
    (params: RecordDepositMovementParams) => {
      persistDepositMovement(params);
    },
    [persistDepositMovement]
  );

  const syncWithdrawDestination = useCallback(
    (params: {
      toChainId: string;
      toTokenAddress: string;
      recipientAddr: string;
      bridgeEvm: string;
    }) => {
      if (!proxyAddress) return;
      void withFundsToken(getAccessToken, async (token) => {
        await upsertFundsWithdrawDestination(token, {
          proxyAddress,
          toChainId: params.toChainId,
          toTokenAddress: params.toTokenAddress,
          recipientAddr: params.recipientAddr,
          bridgeEvm: params.bridgeEvm,
        });
      });
    },
    [getAccessToken, proxyAddress]
  );

  const recordWithdrawComplete = useCallback(
    (params: {
      amountUsd: number;
      bridgeStatusAddress: string;
      toChainId: string;
      toTokenAddress: string;
      recipientAddr: string;
      tokenSymbol?: string | null;
    }) => {
      if (!proxyAddress || params.amountUsd <= 0) return;
      const dedupeKey = `withdraw:${params.bridgeStatusAddress}`;
      if (withdrawRecordedRef.current === dedupeKey) return;
      withdrawRecordedRef.current = dedupeKey;

      void withFundsToken(getAccessToken, async (token) => {
        await recordFundsMovement(
          token,
          buildCompletedMovementPayload({
            proxyAddress,
            movementType: "withdraw",
            amountUsd: params.amountUsd,
            bridgeStatusAddress: params.bridgeStatusAddress,
            toChainId: params.toChainId,
            toTokenAddress: params.toTokenAddress,
            recipientAddr: params.recipientAddr,
            tokenSymbol: params.tokenSymbol,
          })
        );
      });
    },
    [getAccessToken, proxyAddress]
  );

  const getAccessTokenRef = useRef(getAccessToken);
  getAccessTokenRef.current = getAccessToken;

  const fetchMovements = useCallback(async () => {
    const items = await withFundsToken(getAccessTokenRef.current, async (token) => {
      const data = await listFundsMovements(token);
      return data.items;
    });
    return items ?? [];
  }, []);

  return {
    syncDepositBridges,
    syncWithdrawDestination,
    recordDepositComplete,
    recordTransferDepositComplete,
    recordWithdrawComplete,
    fetchMovements,
  };
}

export type FundsPersistenceApi = ReturnType<typeof useFundsPersistence>;
