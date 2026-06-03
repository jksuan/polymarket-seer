export { PUSD_ADDRESS } from "@/components/ui/deposit/constants";
export { POLYGON_CHAIN_ID, USDC_DECIMALS as PUSD_DECIMALS } from "@/lib/constants";

/** Polymarket Bridge withdraw UI minimum (USD). */
export const MIN_WITHDRAW_USD = 3;

/** 站外换币引导（Polygon pUSD → 其他 token）。 */
export const UNISWAP_SWAP_URL = "https://app.uniswap.org/";
export const JUMPER_SWAP_URL = "https://jumper.xyz/";

/** Stop showing only in-flight copy; prompt user to retry status poll after this. */
export const WITHDRAW_STATUS_POLL_TIMEOUT_MS = 2 * 60 * 1000;
