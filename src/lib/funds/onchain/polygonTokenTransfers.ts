import { ADDRESSES, POLYGON_CHAIN_ID } from "@/lib/constants";
import { normalizeEvmAddress } from "@/lib/funds/validation";
import type { FundsMovementListItem } from "@/types/funds";

const ETHERSCAN_V2_BASE = "https://api.etherscan.io/v2/api";
const MAX_PAGES = 10;
const PAGE_SIZE = 100;

const COLLATERAL_TOKEN_ADDRESSES = new Set(
  [ADDRESSES.pUSD, ADDRESSES.USDCe].map((addr) => normalizeEvmAddress(addr))
);

const COUNTERPARTY_DENYLIST = new Set(
  [
    ADDRESSES.CTF,
    ADDRESSES.CTF_EXCHANGE,
    ADDRESSES.CTF_EXCHANGE_V2,
    ADDRESSES.NEG_RISK_CTF_EXCHANGE,
    ADDRESSES.NEG_RISK_CTF_EXCHANGE_V2,
    ADDRESSES.NEG_RISK_ADAPTER,
    ADDRESSES.COLLATERAL_ONRAMP,
  ].map((addr) => normalizeEvmAddress(addr))
);

/** Polymarket CTF / Neg Risk Exchange `matchOrders(...)` — 买/卖共用同一 selector */
export const TX_METHOD_MATCH_ORDERS = "0x3c2b4399";

/** 顶层 `proxy(...)` — Polymarket proxy 钱包 batch（真提现常见入口） */
export const TX_METHOD_PROXY = "0x0a3c4405";

/** EntryPoint `handleOps(...)` — AA bundle（Bridge 充值常见入口） */
export const TX_METHOD_HANDLE_OPS = "0x765e827f";

/** 整笔 tx 从资金 Tab 排除：撮合类顶层调用（同 hash 下所有 tokentx 共享 methodId） */
const EXCLUDED_FUND_TAB_METHOD_IDS = new Set([TX_METHOD_MATCH_ORDERS]);

export type EtherscanTokenTransfer = {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenSymbol: string;
  tokenDecimal: string;
  contractAddress: string;
  logIndex: string;
  /** 顶层交易 method 签名；Etherscan tokentx 同 hash 下各 log 相同 */
  functionName?: string;
  /** 顶层交易四字节 selector；优先于 functionName 解析 */
  methodId?: string;
};

type EtherscanTokenTxResponse = {
  status: string;
  message: string;
  result: EtherscanTokenTransfer[] | string;
};

export function isCollateralTokenAddress(contractAddress: string): boolean {
  return COLLATERAL_TOKEN_ADDRESSES.has(normalizeEvmAddress(contractAddress));
}

export function isDeniedCounterparty(address: string): boolean {
  return COUNTERPARTY_DENYLIST.has(normalizeEvmAddress(address));
}

export function normalizeMethodId(methodId: string | undefined): string | null {
  if (!methodId) return null;
  const trimmed = methodId.trim().toLowerCase();
  if (!trimmed || trimmed === "0x") return null;
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

export function isExcludedFundsTabMethodId(methodId: string | undefined): boolean {
  const normalized = normalizeMethodId(methodId);
  if (!normalized) return false;
  return EXCLUDED_FUND_TAB_METHOD_IDS.has(normalized);
}

/** methodId 缺失时，用 functionName 兜底识别撮合（如 `matchOrders(...)`） */
export function isExcludedFundsTabFunctionName(functionName: string | undefined): boolean {
  if (!functionName) return false;
  const head = functionName.trim().toLowerCase().split("(")[0];
  return head === "matchorders";
}

export function isExcludedFundsTabTransaction(transfer: EtherscanTokenTransfer): boolean {
  return (
    isExcludedFundsTabMethodId(transfer.methodId) ||
    isExcludedFundsTabFunctionName(transfer.functionName)
  );
}

export function buildExcludedTxHashSet(transfers: EtherscanTokenTransfer[]): Set<string> {
  const excluded = new Set<string>();
  for (const transfer of transfers) {
    if (isExcludedFundsTabTransaction(transfer)) {
      excluded.add(transfer.hash.toLowerCase());
    }
  }
  return excluded;
}

export function parseTokenAmountUsd(value: string, tokenDecimal: string): number | null {
  const decimals = Number(tokenDecimal);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) return null;
  try {
    const raw = BigInt(value);
    const scale = BigInt(10) ** BigInt(decimals);
    const whole = raw / scale;
    const fraction = raw % scale;
    const amount = Number(whole) + Number(fraction) / Number(scale);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return amount;
  } catch {
    return null;
  }
}

export function parseTransferOccurredAt(timeStamp: string): string | null {
  const seconds = Number(timeStamp);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

export function classifyDepositWithdraw(
  transfer: EtherscanTokenTransfer,
  proxyAddress: string
): FundsMovementListItem | null {
  if (!isCollateralTokenAddress(transfer.contractAddress)) return null;

  const proxy = normalizeEvmAddress(proxyAddress);
  const from = normalizeEvmAddress(transfer.from);
  const to = normalizeEvmAddress(transfer.to);
  const amountUsd = parseTokenAmountUsd(transfer.value, transfer.tokenDecimal);
  const occurredAt = parseTransferOccurredAt(transfer.timeStamp);
  if (amountUsd === null || !occurredAt) return null;

  if (to === proxy && !isDeniedCounterparty(from)) {
    return {
      movementType: "deposit",
      amountUsd,
      occurredAt,
      status: "completed",
    };
  }

  if (from === proxy && !isDeniedCounterparty(to)) {
    return {
      movementType: "withdraw",
      amountUsd,
      occurredAt,
      status: "completed",
    };
  }

  return null;
}

export function buildOnchainMovementKey(transfer: EtherscanTokenTransfer): string {
  return `onchain:${POLYGON_CHAIN_ID}:${transfer.hash.toLowerCase()}:${transfer.logIndex}`;
}

export function dedupeAndSortMovements(items: FundsMovementListItem[]): FundsMovementListItem[] {
  const byKey = new Map<string, FundsMovementListItem>();
  for (const item of items) {
    const key = `${item.movementType}:${item.occurredAt}:${item.amountUsd.toFixed(6)}`;
    if (!byKey.has(key)) byKey.set(key, item);
  }
  return [...byKey.values()].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );
}

export async function fetchPolygonTokenTransfers(params: {
  proxyAddress: string;
  apiKey: string;
  maxPages?: number;
}): Promise<EtherscanTokenTransfer[]> {
  const proxy = normalizeEvmAddress(params.proxyAddress);
  const maxPages = params.maxPages ?? MAX_PAGES;
  const all: EtherscanTokenTransfer[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const url = new URL(ETHERSCAN_V2_BASE);
    url.searchParams.set("chainid", String(POLYGON_CHAIN_ID));
    url.searchParams.set("module", "account");
    url.searchParams.set("action", "tokentx");
    url.searchParams.set("address", proxy);
    url.searchParams.set("page", String(page));
    url.searchParams.set("offset", String(PAGE_SIZE));
    url.searchParams.set("sort", "desc");
    url.searchParams.set("apikey", params.apiKey);

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Etherscan request failed (${response.status})`);
    }

    const json = (await response.json()) as EtherscanTokenTxResponse;
    if (json.status !== "1" || !Array.isArray(json.result)) {
      if (page === 1 && typeof json.result === "string" && json.result.includes("No transactions found")) {
        return [];
      }
      if (page === 1 && json.message === "No transactions found") {
        return [];
      }
      if (!Array.isArray(json.result) || json.result.length === 0) {
        break;
      }
      throw new Error(typeof json.result === "string" ? json.result : json.message || "Etherscan error");
    }

    all.push(...json.result);
    if (json.result.length < PAGE_SIZE) break;
  }

  return all;
}

export function listCollateralMovementsFromTransfers(params: {
  transfers: EtherscanTokenTransfer[];
  proxyAddress: string;
}): FundsMovementListItem[] {
  const excludedTxHashes = buildExcludedTxHashSet(params.transfers);
  const seen = new Set<string>();
  const items: FundsMovementListItem[] = [];

  for (const transfer of params.transfers) {
    if (excludedTxHashes.has(transfer.hash.toLowerCase())) continue;

    const key = buildOnchainMovementKey(transfer);
    if (seen.has(key)) continue;
    const movement = classifyDepositWithdraw(transfer, params.proxyAddress);
    if (!movement) continue;
    seen.add(key);
    items.push(movement);
  }

  return dedupeAndSortMovements(items);
}

export async function listProxyCollateralMovements(params: {
  proxyAddress: string;
  apiKey: string;
}): Promise<FundsMovementListItem[]> {
  const transfers = await fetchPolygonTokenTransfers(params);
  return listCollateralMovementsFromTransfers({
    transfers,
    proxyAddress: params.proxyAddress,
  });
}
