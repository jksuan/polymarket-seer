import {
  approveErc20IfNeeded,
  getWalletEthereumProvider,
  sendPreparedEvmTx,
  switchEvmChain,
} from "./evm";
import { prepareNativeTransferTx } from "./prepareNativeTransfer";
import type { ExecutionSnapshot } from "./types";

export type ExecuteConnectedOrderParams = {
  locale: string;
  snapshot: ExecutionSnapshot;
  wallet: unknown;
  walletAddress: string;
};

export async function executeConnectedOrder({
  locale,
  snapshot,
  wallet,
  walletAddress,
}: ExecuteConnectedOrderParams): Promise<{ txHash: string; orderId?: string }> {
  if (snapshot.executionEngine === "svm") {
    throw new Error(
      locale === "zh"
        ? "Connected Wallet 的 Solana 执行路径尚未开放，请先使用 Transfer Crypto。"
        : "Connected Wallet execution for Solana is not available yet. Please use Transfer Crypto."
    );
  }

  const ethereumProvider = await getWalletEthereumProvider(wallet);
  await switchEvmChain(ethereumProvider, snapshot.asset.chainId);

  if (snapshot.approveSpender && !snapshot.asset.isNative) {
    await approveErc20IfNeeded({
      amountBaseUnit: snapshot.sourceAmountBaseUnit,
      asset: snapshot.asset,
      owner: walletAddress,
      provider: ethereumProvider,
      spender: snapshot.approveSpender,
    });
  }

  const txToSend = snapshot.asset.isNative
    ? (await prepareNativeTransferTx(snapshot, walletAddress, locale)).tx
    : snapshot.tx;

  const txHash = await sendPreparedEvmTx(ethereumProvider, txToSend);
  return {
    txHash,
    orderId: snapshot.orderId,
  };
}
