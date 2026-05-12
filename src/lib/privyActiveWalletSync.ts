/**
 * 是否与 Privy useActiveWallet 当前地址不一致、需要调用 setActiveWallet(desired)。
 * desired 须为 useWallets() 返回数组中的同一引用，以便 Privy 接受。
 */
export function shouldSyncPrivyActiveWallet(
  privyActiveAddress: string | undefined | null,
  desiredWallet: { address: string } | undefined | null
): desiredWallet is { address: string } {
  if (!desiredWallet?.address) return false;
  const desiredNorm = desiredWallet.address.toLowerCase();
  if (!privyActiveAddress) return true;
  return privyActiveAddress.toLowerCase() !== desiredNorm;
}
