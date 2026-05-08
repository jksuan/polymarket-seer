import { ERC20_ABI } from "@/lib/constants";
import type { BridgeAddressType } from "@/types/bridge";

export const PUSD_ADDRESS = "0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB";
export const POLYGON_USDC_ADDRESS = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
export const ADDRESS_TYPES: BridgeAddressType[] = ["evm", "svm", "btc", "tron"];
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
/** 报价有效期与确认页倒计时一致（与 Polymarket 主站约 30s 行为对齐） */
export const QUOTE_STALE_THRESHOLD_MS = 30_000;
export const QUOTE_PRICE_CHANGE_THRESHOLD = 0.01;
export const CONNECTED_LOW_BALANCE_USD = 1;
export const MAX_DEPOSIT_BALANCE_RATIO = 0.95;
export const BRIDGE_MIN_OUTPUT_BUFFER_USD = 0.05;
export const DEFAULT_SINGLE_TX_CAP_USD = 100_000;
export const DEPOSIT_SINGLE_TX_CAP_USD =
  Number(process.env.NEXT_PUBLIC_DEPOSIT_SINGLE_TX_CAP_USD) || DEFAULT_SINGLE_TX_CAP_USD;
export const SUPPORTED_DLN_EVM_CHAIN_IDS = new Set(["1", "10", "56", "137", "8453", "42161"]);
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
  "8453": "https://base-rpc.publicnode.com",
  "42161": "https://arbitrum-one-rpc.publicnode.com",
};

export function getConnectedMinDepositUsd(minCheckoutUsd?: number): number {
  return Math.max(minCheckoutUsd ?? 1, 1) + BRIDGE_MIN_OUTPUT_BUFFER_USD;
}

/** CoinGecko 小图，偏中性灰，仅作以太坊主网角标，避免与主代币大图混用 */
const COINGECKO_ETH_SMALL_URL =
  "https://assets.coingecko.com/coins/images/279/small/ethereum.png";

export const TOKEN_ICON_URLS: Record<string, string> = {
  /** 主列表 ETH，对应 public/ethereum-eth.svg */
  ETH: "/ethereum-eth.svg",
  POL: "https://assets.coingecko.com/coins/images/32440/small/polygon.png",
  MATIC: "https://assets.coingecko.com/coins/images/4713/small/polygon.png",
  USDC: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
  "USDC.E": "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
  /** pUSD 主图标，对应仓库 public/polymarket-icon.png */
  PUSD: "/polymarket-icon.png",
};

export const CHAIN_ICON_URLS: Record<string, string> = {
  "1": COINGECKO_ETH_SMALL_URL,
  "10": "/images/crypto/op.svg",
  "56": "/images/crypto/bnb.svg",
  "137": TOKEN_ICON_URLS.POL,
  "8453": "/images/crypto/base.svg",
  "42161": "/images/crypto/arb.svg",
};
