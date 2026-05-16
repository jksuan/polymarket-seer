import { ethers } from "ethers";
import { ERC20_EXECUTION_ABI, PUBLIC_RPC_URLS } from "./constants";
import type { DepositAsset, Eip1193Provider, ExecutionTx } from "./types";

const RECEIPT_POLL_INTERVAL_MS = 4_000;
const RECEIPT_POLL_TIMEOUT_MS = 120_000;

export type SendPreparedEvmTxOptions = {
  /** 为 true 时等待 1 个确认；默认广播后立即返回 hash */
  waitForReceipt?: boolean;
};

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

function getWeb3Provider(provider: Eip1193Provider) {
  return new ethers.providers.Web3Provider(
    provider as ethers.providers.ExternalProvider
  );
}

/**
 * 通过钱包发送交易。不手动设置 gasLimit / gasPrice，由 MetaMask 估算（与重构前 63d2c77 行为一致）。
 * 手动 gasLimit 会导致 Polygon 上出现 maxFee≈0、链上失败且 Polygonscan 查不到记录。
 */
export async function sendPreparedEvmTx(
  provider: Eip1193Provider,
  tx: ExecutionTx,
  options?: SendPreparedEvmTxOptions
): Promise<string> {
  const valueBn = ethers.BigNumber.from(tx.value || "0");
  const valueHex = ethers.utils.hexlify(valueBn);

  const web3Provider = getWeb3Provider(provider);
  const signer = web3Provider.getSigner();
  const from = await signer.getAddress();

  const txHash = (await web3Provider.send("eth_sendTransaction", [
    {
      from,
      to: tx.to,
      data: tx.data || "0x",
      value: valueHex,
    },
  ])) as string;

  if (!txHash) {
    throw new Error("Wallet did not return a transaction hash.");
  }

  if (options?.waitForReceipt !== true) {
    return txHash;
  }

  try {
    const receipt = await web3Provider.waitForTransaction(txHash, 1, 90_000);
    if (receipt?.status === 0) {
      throw new Error(
        "Transaction failed on chain. Lower the amount, keep POL for gas, or use Transfer Crypto."
      );
    }
    return receipt?.transactionHash ?? txHash;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toUpperCase().includes("TIMEOUT")) {
      return txHash;
    }
    throw error;
  }
}

export function getEthersSigner(provider: Eip1193Provider) {
  return getWeb3Provider(provider).getSigner();
}

/** 广播后轮询链上回执，用于在 UI 展示链上失败（不阻塞签名返回） */
export async function pollEvmTxReceiptOutcome(
  chainId: string,
  txHash: string
): Promise<"success" | "failed" | "timeout"> {
  const rpcUrl = PUBLIC_RPC_URLS[chainId];
  if (!rpcUrl || !txHash) return "timeout";

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const deadline = Date.now() + RECEIPT_POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (receipt) {
      return receipt.status === 1 ? "success" : "failed";
    }
    await new Promise((resolve) => {
      setTimeout(resolve, RECEIPT_POLL_INTERVAL_MS);
    });
  }

  return "timeout";
}
