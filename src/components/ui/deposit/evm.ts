import { ethers } from "ethers";
import { ERC20_EXECUTION_ABI } from "./constants";
import {
  EVM_TX_GAS_LIMIT_CAP,
  isSimpleNativeTransferTx,
  SIMPLE_NATIVE_TRANSFER_GAS_LIMIT,
} from "./nativeGas";
import type { DepositAsset, Eip1193Provider, ExecutionTx } from "./types";

/** 等待链上回执的最长时间（未上链/被丢弃时避免 UI 一直卡在等待钱包） */
const TX_RECEIPT_TIMEOUT_MS = 90_000;

export async function getWalletEthereumProvider(wallet: unknown): Promise<Eip1193Provider> {
  const maybeWallet = wallet as {
    getEthereumProvider?: () => Promise<Eip1193Provider>;
  };

  if (!maybeWallet.getEthereumProvider) {
    throw new Error("Selected wallet does not expose an Ethereum provider.");
  }

  return maybeWallet.getEthereumProvider();
}

export async function switchEvmChain(provider: Eip1193Provider, chainId: string) {
  const targetChainId = `0x${Number(chainId).toString(16)}`;
  const currentChainId = await provider.request({ method: "eth_chainId" });
  if (typeof currentChainId === "string" && currentChainId.toLowerCase() === targetChainId) {
    return;
  }

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetChainId }],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Please switch your wallet to chain ${chainId}. ${message}`);
  }
}

export async function approveErc20IfNeeded({
  amountBaseUnit,
  asset,
  owner,
  provider,
  spender,
}: {
  amountBaseUnit: string;
  asset: DepositAsset;
  owner: string;
  provider: Eip1193Provider;
  spender: string;
}) {
  if (asset.isNative) return;
  if (!ethers.utils.isAddress(asset.tokenAddress)) return;
  if (!ethers.utils.isAddress(spender)) {
    throw new Error("deBridge transaction did not include a valid spender.");
  }

  const signer = getEthersSigner(provider);
  const token = new ethers.Contract(asset.tokenAddress, ERC20_EXECUTION_ABI, signer);
  const allowance = await token.allowance(owner, spender);
  const amount = ethers.BigNumber.from(amountBaseUnit);
  if (allowance.gte(amount)) return;

  const approval = await token.approve(spender, amount);
  await approval.wait();
}

export async function sendPreparedEvmTx(
  provider: Eip1193Provider,
  tx: ExecutionTx
): Promise<string> {
  const valueBn = ethers.BigNumber.from(tx.value || "0");
  const valueHex = ethers.utils.hexlify(valueBn);

  const web3Provider = new ethers.providers.Web3Provider(
    provider as ethers.providers.ExternalProvider
  );
  const signer = web3Provider.getSigner();
  const from = await signer.getAddress();

  const txRequest: Record<string, string> = {
    from,
    to: tx.to,
    data: tx.data || "0x",
    value: valueHex,
  };

  const feeData = await web3Provider.getFeeData();
  const gasPrice =
    feeData.gasPrice ??
    feeData.maxFeePerGas ??
    ethers.BigNumber.from(await web3Provider.send("eth_gasPrice", []));

  if (isSimpleNativeTransferTx(tx)) {
    txRequest.gas = ethers.utils.hexlify(SIMPLE_NATIVE_TRANSFER_GAS_LIMIT);
    if (feeData.maxFeePerGas) {
      txRequest.maxFeePerGas = ethers.utils.hexlify(feeData.maxFeePerGas);
      txRequest.maxPriorityFeePerGas = ethers.utils.hexlify(
        feeData.maxPriorityFeePerGas ?? feeData.maxFeePerGas
      );
    } else {
      txRequest.gasPrice = ethers.utils.hexlify(gasPrice);
    }
  } else {
    try {
      const estimated = await web3Provider.estimateGas({
        from,
        to: tx.to,
        data: txRequest.data,
        value: valueHex,
      });
      const capped = estimated.gt(EVM_TX_GAS_LIMIT_CAP)
        ? ethers.BigNumber.from(EVM_TX_GAS_LIMIT_CAP)
        : estimated;
      txRequest.gas = ethers.utils.hexlify(capped.mul(120).div(100));
    } catch {
      txRequest.gas = ethers.utils.hexlify(EVM_TX_GAS_LIMIT_CAP);
    }
    if (feeData.maxFeePerGas) {
      txRequest.maxFeePerGas = ethers.utils.hexlify(feeData.maxFeePerGas);
      txRequest.maxPriorityFeePerGas = ethers.utils.hexlify(
        feeData.maxPriorityFeePerGas ?? feeData.maxFeePerGas
      );
    } else {
      txRequest.gasPrice = ethers.utils.hexlify(gasPrice);
    }
  }

  const txHash = (await web3Provider.send("eth_sendTransaction", [txRequest])) as string;

  const receipt = await web3Provider.waitForTransaction(txHash, 1, TX_RECEIPT_TIMEOUT_MS);
  if (!receipt) {
    throw new Error(
      "Transaction was not confirmed on chain within 90s. It may have been dropped. Check your wallet activity or use Transfer Crypto."
    );
  }
  if (receipt.status === 0) {
    throw new Error(
      "Transaction failed on chain. Lower the amount, keep POL for gas, or use Transfer Crypto."
    );
  }
  return receipt.transactionHash ?? txHash;
}

export function getEthersSigner(provider: Eip1193Provider) {
  return new ethers.providers.Web3Provider(
    provider as ethers.providers.ExternalProvider
  ).getSigner();
}
