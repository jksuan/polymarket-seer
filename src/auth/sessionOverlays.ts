/** 顶栏资金类抽屉等：本地 isOpen 与登录态共同决定可见性 */
export function resolveOverlayOpen(localOpen: boolean, authenticated: boolean): boolean {
  return localOpen && authenticated;
}

/** 交易终端等：打开时所绑定的 sessionEpoch 与当前不一致则会话已结束，应 dismiss */
export function shouldDismissOverlayForSessionEpoch(
  epochWhenOpened: number | null,
  currentEpoch: number,
  isOpen: boolean
): boolean {
  if (!isOpen || epochWhenOpened === null) return false;
  return epochWhenOpened !== currentEpoch;
}
