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

type EvmTxRequest = {
  from: string;
  to: string;
  data: string;
  value: string;
};

/** JSON-RPC quantity：禁止 0x 后出现前导 0（Go hexutil.Big 会拒绝） */
export function formatRpcQuantityHex(value: ethers.BigNumberish): string {
  return ethers.utils.hexValue(value);
}

async function buildEvmTxRequest(
  provider: Eip1193Provider,
  tx: ExecutionTx
): Promise<EvmTxRequest> {
  const web3Provider = getWeb3Provider(provider);
  const signer = web3Provider.getSigner();
  const from = await signer.getAddress();
  const valueBn = ethers.BigNumber.from(tx.value || "0");

  return {
    from,
    to: tx.to,
    data: tx.data || "0x",
    value: formatRpcQuantityHex(valueBn),
  };
}

/**
 * 发送前经钱包 eth_estimateGas 预检（不改 value / gasLimit）。
 * 避免 MetaMask 在估 gas 失败时回退到 49M limit 并触发 Polygon cap 报错。
 */
export async function preflightWalletEstimateGas(
  provider: Eip1193Provider,
  request: EvmTxRequest
): Promise<void> {
  await provider.request({
    method: "eth_estimateGas",
    params: [request],
  });
}

/**
 * 原生币转账：链上余额必须严格大于 value，否则无法支付网络费。
 * 不做固定 gas 预留，仅依据 getBalance 与 value 比较。
 */
export async function assertNativeTransferBalanceCoversValue(
  provider: Eip1193Provider,
  valueWei: ethers.BigNumberish
): Promise<void> {
  const value = ethers.BigNumber.from(valueWei);
  if (value.lte(0)) return;

  const signer = getWeb3Provider(provider).getSigner();
  const balance = await signer.getBalance();
  if (!balance.gt(value)) {
    throw new Error("insufficient funds for gas * price + value");
  }
}

/**
 * 通过钱包发送交易。不设置 gasLimit / gasPrice，由 MetaMask 估算。
 */
export async function sendPreparedEvmTx(
  provider: Eip1193Provider,
  tx: ExecutionTx,
  options?: SendPreparedEvmTxOptions
): Promise<string> {
  const valueBn = ethers.BigNumber.from(tx.value || "0");
  const request = await buildEvmTxRequest(provider, tx);

  if (valueBn.gt(0)) {
    await assertNativeTransferBalanceCoversValue(provider, valueBn);
    await preflightWalletEstimateGas(provider, request);
  }

  const signer = getWeb3Provider(provider).getSigner();
  const response = await signer.sendTransaction({
    to: request.to,
    data: request.data,
    value: valueBn,
  });

  const txHash = response.hash;
  if (!txHash) {
    throw new Error("Wallet did not return a transaction hash.");
  }

  if (options?.waitForReceipt !== true) {
    return txHash;
  }

  try {
    const receipt = await response.wait(1);
    if (receipt?.status === 0) {
      throw new Error("Transaction failed on chain.");
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
