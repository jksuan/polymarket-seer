import { useCallback, useEffect, useRef } from "react";

export function useDepositBalanceRefresh({
  depositBridgeComplete,
  transferBridgeComplete,
  onBalanceRefresh,
}: {
  depositBridgeComplete: boolean;
  transferBridgeComplete: boolean;
  onBalanceRefresh?: () => void;
}) {
  const prevDepositBridgeCompleteRef = useRef(false);
  const prevTransferBridgeCompleteRef = useRef(false);
  const balanceRefreshRetryTimersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      balanceRefreshRetryTimersRef.current.forEach((timerId) =>
        window.clearTimeout(timerId)
      );
      balanceRefreshRetryTimersRef.current = [];
    };
  }, []);

  const scheduleBalanceRefreshRetries = useCallback(() => {
    balanceRefreshRetryTimersRef.current.forEach((timerId) =>
      window.clearTimeout(timerId)
    );
    balanceRefreshRetryTimersRef.current = [];
    const retryDelays = [8_000, 20_000];
    balanceRefreshRetryTimersRef.current = retryDelays.map((delayMs) =>
      window.setTimeout(() => {
        onBalanceRefresh?.();
      }, delayMs)
    );
  }, [onBalanceRefresh]);

  useEffect(() => {
    const rose = depositBridgeComplete && !prevDepositBridgeCompleteRef.current;
    prevDepositBridgeCompleteRef.current = depositBridgeComplete;
    if (!rose) return;
    onBalanceRefresh?.();
    scheduleBalanceRefreshRetries();
  }, [depositBridgeComplete, onBalanceRefresh, scheduleBalanceRefreshRetries]);

  useEffect(() => {
    const rose = transferBridgeComplete && !prevTransferBridgeCompleteRef.current;
    prevTransferBridgeCompleteRef.current = transferBridgeComplete;
    if (!rose) return;
    onBalanceRefresh?.();
    scheduleBalanceRefreshRetries();
  }, [onBalanceRefresh, scheduleBalanceRefreshRetries, transferBridgeComplete]);
}
