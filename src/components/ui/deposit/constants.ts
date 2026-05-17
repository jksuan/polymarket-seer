import { ERC20_ABI } from "@/lib/constants";
import type { BridgeAddressType } from "@/types/bridge";

export const PUSD_ADDRESS = "0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB";
export const POLYGON_USDC_ADDRESS = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
export const ADDRESS_TYPES: BridgeAddressType[] = ["evm", "svm", "btc", "tron"];
/** 创建 Polymarket 入账地址时向前端桥 API 请求的地址类型（弱约束：上游可省略 svm 等） */
export const DEPOSIT_CREATE_REQUESTED_ADDRESS_TYPES: BridgeAddressType[] = ["evm", "svm"];
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
/** 报价有效期与确认页倒计时一致（与 Polymarket 主站约 30s 行为对齐） */
export const QUOTE_STALE_THRESHOLD_MS = 30_000;
export const QUOTE_PRICE_CHANGE_THRESHOLD = 0.01;
export const CONNECTED_LOW_BALANCE_USD = 1;
export const DEFAULT_CONNECTED_MAX_BUFFER_USD = 1;
export const CONNECTED_MAX_BUFFER_USD =
  Number(process.env.NEXT_PUBLIC_CONNECTED_MAX_BUFFER_USD) || DEFAULT_CONNECTED_MAX_BUFFER_USD;
export const BRIDGE_MIN_OUTPUT_BUFFER_USD = 0.05;
export const DEFAULT_SINGLE_TX_CAP_USD = 100_000;
export const DEPOSIT_SINGLE_TX_CAP_USD =
  Number(process.env.NEXT_PUBLIC_DEPOSIT_SINGLE_TX_CAP_USD) || DEFAULT_SINGLE_TX_CAP_USD;
export const SUPPORTED_DLN_EVM_CHAIN_IDS = new Set([
  "1",
  "10",
  "56",
  "137",
  "143",
  "8453",
  "999",
  "42161",
]);
export const ERC20_EXECUTION_ABI = [
  ...ERC20_ABI,
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
];
export const NATIVE_TOKEN_ADDRESSES = new Set([
  ZERO_ADDRESS.toLowerCase(),
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  "0x0000000000000000000000000000000000001010",
]);
export const PUBLIC_RPC_URLS: Record<string, string> = {
  "1": "https://ethereum.publicnode.com",
  "10": "https://optimism-rpc.publicnode.com",
  "56": "https://bsc-rpc.publicnode.com",
  "137": "https://polygon-bor-rpc.publicnode.com",
  "143": "https://rpc.monad.xyz",
  "8453": "https://base-rpc.publicnode.com",
  "999": "https://rpc.hyperliquid.xyz/evm",
  "42161": "https://arbitrum-one-rpc.publicnode.com",
};

export function getConnectedMinDepositUsd(minCheckoutUsd?: number): number {
  return Math.max(minCheckoutUsd ?? 1, 1) + BRIDGE_MIN_OUTPUT_BUFFER_USD;
}
