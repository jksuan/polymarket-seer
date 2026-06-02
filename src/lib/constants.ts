// ============================================================
// Polymarket 全局常量 - 合约地址、API 端点、链配置
// ============================================================

/** Polygon 主网 Chain ID */
export const POLYGON_CHAIN_ID = 137;

/** Polymarket CLOB API 端点 */
export const CLOB_API_URL = "https://clob.polymarket.com";

/** Polymarket Data API 端点 */
export const DATA_API_URL = "https://data-api.polymarket.com";

/** Polymarket Gamma API 端点 (市场/事件/搜索) */
export const GAMMA_API_URL = "https://gamma-api.polymarket.com";

/** Polymarket Relayer V2 端点 */
export const RELAYER_URL = "https://relayer-v2.polymarket.com/";

/** Polygon 上的 Safe Factory 地址 (用于 deriveSafe) */
export const SAFE_FACTORY_POLYGON = "0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b";

/** Polymarket 相关的合约地址 */
export const ADDRESSES = {
  /** USDC.e on Polygon */
  USDCe: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  /** pUSD CollateralToken proxy on Polygon（Polymarket 交易 collateral） */
  pUSD: "0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB",
  /** Conditional Tokens Framework */
  CTF: "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045",
  /** CTF Exchange (正向市场, V1) */
  CTF_EXCHANGE: "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E",
  /** CTF Exchange V2（clob-client-v2 市价/限价单实际使用的 Exchange） */
  CTF_EXCHANGE_V2: "0xE111180000d2663C0091e4f400237545B87B996B",
  /** Neg Risk CTF Exchange (V1) */
  NEG_RISK_CTF_EXCHANGE: "0xC5d563A36AE78145C45a50134d48A1215220f80a",
  /** Neg Risk CTF Exchange V2 */
  NEG_RISK_CTF_EXCHANGE_V2: "0xe2222d279d744050d28e00520010520000310F59",
  /** Neg Risk Adapter (NegRisk 市场的代币管理与兑换) */
  NEG_RISK_ADAPTER: "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296",
  /** Collateral Onramp：USDC.e → pUSD wrap */
  COLLATERAL_ONRAMP: "0x93070a847efEf7F70739046A929D47a521F5B8ee",
} as const;

/** Collateral Onramp ABI 片段 */
export const COLLATERAL_ONRAMP_ABI = [
  "function wrap(address _asset, address _to, uint256 _amount)",
];

/** USDC.e 精度 (6位小数) */
export const USDC_DECIMALS = 6;

/** ERC20 ABI 片段 - 用于 approve、allowance 和 balanceOf */
export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
];

/** ERC1155 ABI 片段 - 用于 setApprovalForAll */
export const ERC1155_ABI = [
  "function setApprovalForAll(address operator, bool approved)",
  "function isApprovedForAll(address account, address operator) view returns (bool)",
];

/** CTF ABI 片段 - 用于 redeemPositions (标准二元市场) */
export const CTF_ABI = [
  "function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] indexSets)",
];

/** NegRiskAdapter ABI 片段 - 用于 redeemPositions (NegRisk 多结果互斥市场) */
export const NEG_RISK_ADAPTER_ABI = [
  "function redeemPositions(bytes32 conditionId, uint256[] amounts)",
];

/** Gnosis Safe 签名类型（CLOB V2 SignatureTypeV2.POLY_GNOSIS_SAFE = 2） */
export const SIGNATURE_TYPE_GNOSIS_SAFE = 2;

/** localStorage 中 API 凭证缓存的 key 前缀 */
export const CREDS_CACHE_PREFIX = "poly_creds_";

/** 空的 parentCollectionId (redeemPositions 使用) */
export const ZERO_PARENT_COLLECTION_ID = "0x0000000000000000000000000000000000000000000000000000000000000000";
