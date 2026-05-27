import { ethers } from "ethers";

import {
  ADDRESSES,
  COLLATERAL_ONRAMP_ABI,
  ERC20_ABI,
  ERC1155_ABI,
  USDC_DECIMALS,
} from "@/lib/constants";

export type CollateralAllowanceResponse = {
  balance?: string | null;
  allowance?: string | null;
} | null;

export type ClobCollateralClient = {
  updateBalanceAllowance: (params?: { asset_type?: string; token_id?: string }) => Promise<void>;
  getBalanceAllowance: (params?: { asset_type?: string; token_id?: string }) => Promise<CollateralAllowanceResponse>;
};

export type RelayTransaction = {
  to: string;
  data: string;
  value: string;
};

export type RelayExecutor = {
  execute: (transactions: RelayTransaction[], label: string) => Promise<void>;
};

/** Polymarket 官方流程：先 sync CLOB 缓存，再读 getBalanceAllowance(COLLATERAL) */
export async function syncAndGetClobCollateralAllowance(
  clobClient: ClobCollateralClient
): Promise<CollateralAllowanceResponse> {
  await clobClient.updateBalanceAllowance({ asset_type: "COLLATERAL" });
  return clobClient.getBalanceAllowance({ asset_type: "COLLATERAL" });
}

export function parseCollateralAtomicUnits(value: string | null | undefined): bigint {
  if (value == null || value === "") return BigInt(0);
  try {
    return BigInt(value);
  } catch {
    return BigInt(0);
  }
}

export function formatCollateralBalanceFromAtomicUnits(atomicUnits: bigint | string): string {
  const atomic =
    typeof atomicUnits === "bigint" ? atomicUnits : parseCollateralAtomicUnits(String(atomicUnits));
  const whole = Number(atomic) / 10 ** USDC_DECIMALS;
  return whole.toFixed(2);
}

export async function readProxyUsdcEAtomic(
  provider: ethers.providers.Provider,
  proxyAddress: string
): Promise<bigint> {
  const usdc = new ethers.Contract(ADDRESSES.USDCe, ERC20_ABI, provider);
  const usdcBal = await usdc.balanceOf(proxyAddress);
  return BigInt(usdcBal.toString());
}

export async function readProxyPusdAtomic(
  provider: ethers.providers.Provider,
  proxyAddress: string
): Promise<bigint> {
  try {
    const pusd = new ethers.Contract(ADDRESSES.pUSD, ERC20_ABI, provider);
    const pusdBal = await pusd.balanceOf(proxyAddress);
    return BigInt(pusdBal.toString());
  } catch {
    return BigInt(0);
  }
}

/** legacy Safe 上未 wrap 的 USDC.e → pUSD（Collateral Onramp） */
export function buildLegacyUsdcWrapRelayBatch(
  proxyAddress: string,
  usdcEAtomic: bigint
): RelayTransaction[] {
  const erc20 = new ethers.utils.Interface(ERC20_ABI);
  const onramp = new ethers.utils.Interface(COLLATERAL_ONRAMP_ABI);
  return [
    {
      to: ADDRESSES.USDCe,
      data: erc20.encodeFunctionData("approve", [ADDRESSES.COLLATERAL_ONRAMP, usdcEAtomic]),
      value: "0",
    },
    {
      to: ADDRESSES.COLLATERAL_ONRAMP,
      data: onramp.encodeFunctionData("wrap", [ADDRESSES.USDCe, proxyAddress, usdcEAtomic]),
      value: "0",
    },
  ];
}

/** pUSD 交易所需 allowance（与 Polymarket 官方 Required Approvals 对齐） */
export function buildPusdTradingApprovalRelayBatch(): RelayTransaction[] {
  const erc20 = new ethers.utils.Interface(ERC20_ABI);
  const MAX = ethers.constants.MaxUint256;
  return [
    { to: ADDRESSES.pUSD, data: erc20.encodeFunctionData("approve", [ADDRESSES.CTF, MAX]), value: "0" },
    {
      to: ADDRESSES.pUSD,
      data: erc20.encodeFunctionData("approve", [ADDRESSES.CTF_EXCHANGE, MAX]),
      value: "0",
    },
    {
      to: ADDRESSES.pUSD,
      data: erc20.encodeFunctionData("approve", [ADDRESSES.NEG_RISK_CTF_EXCHANGE, MAX]),
      value: "0",
    },
  ];
}

/** 下单前 relayer 批次：legacy USDC.e approve + pUSD approve + ERC1155 */
export function buildTradingApprovalRelayBatch(): RelayTransaction[] {
  const erc20 = new ethers.utils.Interface(ERC20_ABI);
  const erc1155 = new ethers.utils.Interface(ERC1155_ABI);
  const MAX = ethers.constants.MaxUint256;

  return [
    { to: ADDRESSES.USDCe, data: erc20.encodeFunctionData("approve", [ADDRESSES.CTF, MAX]), value: "0" },
    {
      to: ADDRESSES.USDCe,
      data: erc20.encodeFunctionData("approve", [ADDRESSES.CTF_EXCHANGE, MAX]),
      value: "0",
    },
    {
      to: ADDRESSES.USDCe,
      data: erc20.encodeFunctionData("approve", [ADDRESSES.NEG_RISK_CTF_EXCHANGE, MAX]),
      value: "0",
    },
    ...buildPusdTradingApprovalRelayBatch(),
    {
      to: ADDRESSES.CTF,
      data: erc1155.encodeFunctionData("setApprovalForAll", [ADDRESSES.CTF_EXCHANGE, true]),
      value: "0",
    },
  ];
}

const wrapLocks = new Map<string, Promise<void>>();
const wrapFailedProxies = new Set<string>();

/** 单测重置 wrap 状态 */
export function resetCollateralWrapStateForTests(): void {
  wrapLocks.clear();
  wrapFailedProxies.clear();
}

/**
 * 使 proxy Safe collateral 与 CLOB 一致：
 * 1. updateBalanceAllowance → getBalanceAllowance
 * 2. CLOB=0 且链上仍有 USDC.e 时，经 relayer 执行 Collateral Onramp wrap + pUSD approve
 * 3. 再次 sync，返回 CLOB 可交易余额
 */
export async function ensureProxyCollateralSynced(params: {
  clobClient: ClobCollateralClient;
  provider: ethers.providers.Provider;
  proxyAddress: string;
  relayExecutor?: RelayExecutor;
  /** 单测注入：读取 proxy USDC.e 余额 */
  readUsdcEAtomic?: (
    provider: ethers.providers.Provider,
    proxyAddress: string
  ) => Promise<bigint>;
}): Promise<{ balanceAtomic: bigint; allowanceResponse: CollateralAllowanceResponse }> {
  let allowanceResponse = await syncAndGetClobCollateralAllowance(params.clobClient);
  let balanceAtomic = parseCollateralAtomicUnits(allowanceResponse?.balance ?? null);

  const readUsdcE = params.readUsdcEAtomic ?? readProxyUsdcEAtomic;
  const usdcEAtomic = await readUsdcE(params.provider, params.proxyAddress);

  if (
    balanceAtomic === BigInt(0) &&
    usdcEAtomic > BigInt(0) &&
    params.relayExecutor &&
    !wrapFailedProxies.has(params.proxyAddress)
  ) {
    const lockKey = params.proxyAddress;
    if (!wrapLocks.has(lockKey)) {
      wrapLocks.set(
        lockKey,
        (async () => {
          try {
            const wrapBatch = buildLegacyUsdcWrapRelayBatch(params.proxyAddress, usdcEAtomic);
            const approvalBatch = buildPusdTradingApprovalRelayBatch();
            await params.relayExecutor!.execute(
              [...wrapBatch, ...approvalBatch],
              "Wrap USDC.e to pUSD"
            );
          } catch (err) {
            wrapFailedProxies.add(params.proxyAddress);
            console.warn("[collateral] USDC.e → pUSD wrap 失败", err);
            throw err;
          } finally {
            wrapLocks.delete(lockKey);
          }
        })()
      );
    }

    try {
      await wrapLocks.get(lockKey);
      allowanceResponse = await syncAndGetClobCollateralAllowance(params.clobClient);
      balanceAtomic = parseCollateralAtomicUnits(allowanceResponse?.balance ?? null);
    } catch {
      // wrap 失败时保持 CLOB=0，避免展示不可交易余额
    }
  }

  return { balanceAtomic, allowanceResponse };
}
