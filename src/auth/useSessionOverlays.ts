"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const INITIAL_SESSION_EPOCH = 1;

export function useSessionOverlays(authenticated: boolean) {
  const [sessionEpoch, setSessionEpoch] = useState(INITIAL_SESSION_EPOCH);
  const prevAuthenticatedRef = useRef<boolean | null>(null);
  const bumpedForLogoutRef = useRef(false);

  const bumpSessionEpoch = useCallback(() => {
    bumpedForLogoutRef.current = true;
    setSessionEpoch((epoch) => epoch + 1);
  }, []);

  useEffect(() => {
    if (prevAuthenticatedRef.current === null) {
      prevAuthenticatedRef.current = authenticated;
      return;
    }
    const prev = prevAuthenticatedRef.current;
    prevAuthenticatedRef.current = authenticated;
    if (prev === true && authenticated === false) {
      if (!bumpedForLogoutRef.current) {
        setSessionEpoch((epoch) => epoch + 1);
      }
      bumpedForLogoutRef.current = false;
    }
  }, [authenticated]);

  return { sessionEpoch, bumpSessionEpoch };
}

/** 顶栏抽屉：sessionEpoch 变化时重置本地打开态 */
export function useCloseOnSessionEpoch(sessionEpoch: number, onClose: () => void) {
  const seenEpochRef = useRef(sessionEpoch);

  useEffect(() => {
    if (seenEpochRef.current === sessionEpoch) return;
    seenEpochRef.current = sessionEpoch;
    onClose();
  }, [sessionEpoch, onClose]);
}

/** 交易终端：打开时绑定 epoch，会话结束后触发 onDismiss */
export function useDismissOverlayOnSessionEnd(
  isOpen: boolean,
  sessionEpoch: number,
  onDismiss: () => void
) {
  const epochWhenOpenedRef = useRef<number | null>(null);
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      epochWhenOpenedRef.current = sessionEpoch;
    }
    if (!isOpen) {
      epochWhenOpenedRef.current = null;
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, sessionEpoch]);

  useEffect(() => {
    const epochWhenOpened = epochWhenOpenedRef.current;
    if (!isOpen || epochWhenOpened === null) return;
    if (epochWhenOpened !== sessionEpoch) {
      onDismiss();
    }
  }, [sessionEpoch, isOpen, onDismiss]);
}
