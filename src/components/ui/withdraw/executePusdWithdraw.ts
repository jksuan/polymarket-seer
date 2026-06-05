import { AssetType } from "@polymarket/clob-client-v2";
import { ethers } from "ethers";

import { ensureTradingVaultDeployed } from "@/auth/ensureTradingVaultDeployed";
import {
  buildLegacyUsdcWrapRelayBatch,
  InsufficientOnChainPusdError,
  readProxyPusdAtomic,
  readProxyUsdcEAtomic,
  type ClobCollateralClient,
  type RelayTransaction,
} from "@/auth/collateralBalance";
import {
  createTradingRelayClient,
  executeDepositWalletRelayBatch,
  resolveTradingVault,
} from "@/auth/vault";
import { createClobClient } from "@/lib/clobClientFactory";
import { ERC20_ABI } from "@/lib/constants";
import { getCachedCreds } from "@/lib/utils";
import { PUSD_ADDRESS } from "./constants";

function buildPusdTransferTx(
  bridgeDepositAddress: string,
  amountBaseUnit: string
): RelayTransaction {
  const erc20 = new ethers.utils.Interface([
    ...ERC20_ABI,
    "function transfer(address to, uint256 amount) returns (bool)",
  ]);
  return {
    to: PUSD_ADDRESS,
    data: erc20.encodeFunctionData("transfer", [bridgeDepositAddress, amountBaseUnit]),
    value: "0",
  };
}

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

  const provider = signer.provider;
  if (!provider) {
    throw new Error("Wallet provider unavailable");
  }

  const amountAtomic = BigInt(amountBaseUnit);
  let onChainPusd = await readProxyPusdAtomic(provider, proxyAddress);

  const signerAddress = await signer.getAddress();
  const creds = getCachedCreds(signerAddress);
  if (creds?.key) {
    try {
      const vault = await resolveTradingVault(signer, proxyAddress);
      const clobClient = createClobClient({
        signer: signer as never,
        creds,
        funderAddress: vault.address,
        signatureType: vault.signatureType,
      }) as ClobCollateralClient;
      await clobClient.updateBalanceAllowance({ asset_type: AssetType.COLLATERAL });
      onChainPusd = await readProxyPusdAtomic(provider, proxyAddress);
    } catch (syncErr) {
      console.warn("[withdraw] CLOB collateral sync before transfer skipped", syncErr);
    }
  }

  const relayClient = createTradingRelayClient(signer);
  const transferTx = buildPusdTransferTx(bridgeDepositAddress, amountBaseUnit);

  if (onChainPusd >= amountAtomic) {
    await executeDepositWalletRelayBatch(relayClient, proxyAddress, [transferTx], "Withdraw pUSD");
    return "";
  }

  const usdcEAtomic = await readProxyUsdcEAtomic(provider, proxyAddress);
  const shortfall = amountAtomic - onChainPusd;

  if (usdcEAtomic >= shortfall) {
    const wrapBatch = buildLegacyUsdcWrapRelayBatch(proxyAddress, shortfall);
    await executeDepositWalletRelayBatch(
      relayClient,
      proxyAddress,
      [...wrapBatch, transferTx],
      "Wrap USDC.e and withdraw pUSD"
    );
    return "";
  }

  if (onChainPusd + usdcEAtomic >= amountAtomic) {
    const wrapBatch = buildLegacyUsdcWrapRelayBatch(proxyAddress, usdcEAtomic);
    await executeDepositWalletRelayBatch(
      relayClient,
      proxyAddress,
      [...wrapBatch, transferTx],
      "Wrap USDC.e and withdraw pUSD"
    );
    return "";
  }

  throw new InsufficientOnChainPusdError(onChainPusd, amountAtomic);
}
