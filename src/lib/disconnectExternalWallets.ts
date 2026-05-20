type DisconnectableWallet = {
  walletClientType?: string;
  disconnect?: () => Promise<void>;
};

export async function disconnectExternalWallets(
  wallets: DisconnectableWallet[] | undefined
): Promise<void> {
  if (!wallets?.length) return;

  await Promise.all(
    wallets
      .filter((w) => w.walletClientType && w.walletClientType !== "privy")
      .map(async (w) => {
        try {
          await w.disconnect?.();
        } catch (err) {
          console.warn("[退出登录] 断开外链失败:", w.walletClientType, err);
        }
      })
  );
}
