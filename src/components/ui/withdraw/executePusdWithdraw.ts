import { ethers } from "ethers";

import { ensureTradingVaultDeployed } from "@/auth/ensureTradingVaultDeployed";
import {
  createTradingRelayClient,
  executeDepositWalletRelayBatch,
} from "@/auth/vault";
import { ERC20_ABI } from "@/lib/constants";
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
  await ensureTradingVaultDeployed(signer, proxyAddress);

  const erc20 = new ethers.utils.Interface([
    ...ERC20_ABI,
    "function transfer(address to, uint256 amount) returns (bool)",
  ]);
  const data = erc20.encodeFunctionData("transfer", [bridgeDepositAddress, amountBaseUnit]);
  const relayClient = createTradingRelayClient(signer);
  await executeDepositWalletRelayBatch(
    relayClient,
    proxyAddress,
    [{ to: PUSD_ADDRESS, data, value: "0" }],
    "Withdraw pUSD"
  );
  return "";
}
