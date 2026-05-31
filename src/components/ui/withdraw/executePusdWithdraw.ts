import { ethers } from "ethers";
import { RelayClient, RelayerTxType } from "@polymarket/builder-relayer-client";
import { BuilderConfig } from "@polymarket/builder-relayer-client/node_modules/@polymarket/builder-signing-sdk";
import { ensureSafeDeployed } from "@/auth/ensureSafeDeployed";
import { ERC20_ABI, POLYGON_CHAIN_ID, RELAYER_URL } from "@/lib/constants";
import { PUSD_ADDRESS } from "./constants";

export async function executePusdWithdrawTransfer({
  signer,
  proxyAddress,
  bridgeDepositAddress,
  amountBaseUnit,
}: {
  signer: ethers.Signer;
  proxyAddress: string;
  bridgeDepositAddress: string;
  amountBaseUnit: string;
}): Promise<string> {
  await ensureSafeDeployed(signer, proxyAddress);

  const erc20 = new ethers.utils.Interface([
    ...ERC20_ABI,
    "function transfer(address to, uint256 amount) returns (bool)",
  ]);
  const data = erc20.encodeFunctionData("transfer", [bridgeDepositAddress, amountBaseUnit]);
  const builderConfig = new BuilderConfig({
    remoteBuilderConfig: { url: `${window.location.origin}/api/sign` },
  });
  const relayClient = new RelayClient(
    RELAYER_URL,
    POLYGON_CHAIN_ID,
    signer as any,
    builderConfig,
    RelayerTxType.SAFE
  );
  const tx = await relayClient.execute(
    [{ to: PUSD_ADDRESS, data, value: "0" }],
    "Withdraw pUSD"
  );
  await tx.wait();
  const txHash =
    typeof (tx as { transactionHash?: string }).transactionHash === "string"
      ? (tx as { transactionHash: string }).transactionHash
      : typeof (tx as { hash?: string }).hash === "string"
        ? (tx as { hash: string }).hash
        : "";
  return txHash;
}
