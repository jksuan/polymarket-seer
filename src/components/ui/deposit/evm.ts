import { ethers } from "ethers";
import { ERC20_EXECUTION_ABI } from "./constants";
import type { DepositAsset, Eip1193Provider, ExecutionTx } from "./types";

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

  const txHash = (await web3Provider.send("eth_sendTransaction", [
    {
      from,
      to: tx.to,
      data: tx.data,
      value: valueHex,
    },
  ])) as string;

  const receipt = await web3Provider.waitForTransaction(txHash);
  return receipt.transactionHash ?? txHash;
}

export function getEthersSigner(provider: Eip1193Provider) {
  return new ethers.providers.Web3Provider(
    provider as ethers.providers.ExternalProvider
  ).getSigner();
}
