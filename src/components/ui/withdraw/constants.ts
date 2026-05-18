export { PUSD_ADDRESS } from "@/components/ui/deposit/constants";
export { POLYGON_CHAIN_ID, USDC_DECIMALS as PUSD_DECIMALS } from "@/lib/constants";

/** Polymarket Bridge withdraw UI minimum (USD). */
export const MIN_WITHDRAW_USD = 3;

/** Native USDC on Polygon (withdraw receive default). */
export const POLYGON_USDC_ADDRESS = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";

export const QUOTE_DEBOUNCE_MS = 400;

/** Stop showing only in-flight copy; prompt user to retry status poll after this. */
export const WITHDRAW_STATUS_POLL_TIMEOUT_MS = 2 * 60 * 1000;
