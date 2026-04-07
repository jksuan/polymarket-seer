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
  /** Conditional Tokens Framework */
  CTF: "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045",
  /** CTF Exchange (正向市场) */
  CTF_EXCHANGE: "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E",
  /** Neg Risk CTF Exchange (反向风险市场) */
  NEG_RISK_CTF_EXCHANGE: "0xC5d563A36AE78145C45a50134d48A1215220f80a",
  /** Neg Risk Adapter (NegRisk 市场的代币管理与兑换) */
  NEG_RISK_ADAPTER: "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296",
} as const;

/** USDC.e 精度 (6位小数) */
export const USDC_DECIMALS = 6;

/** ERC20 ABI 片段 - 用于 approve 和 balanceOf */
export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
];

/** ERC1155 ABI 片段 - 用于 setApprovalForAll */
export const ERC1155_ABI = [
  "function setApprovalForAll(address operator, bool approved)",
];

/** CTF ABI 片段 - 用于 redeemPositions (标准二元市场) */
export const CTF_ABI = [
  "function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] indexSets)",
];

/** NegRiskAdapter ABI 片段 - 用于 redeemPositions (NegRisk 多结果互斥市场) */
export const NEG_RISK_ADAPTER_ABI = [
  "function redeemPositions(bytes32 conditionId, uint256[] amounts)",
];

/** Gnosis Safe 签名类型标识 (ClobClient 的 signatureType 参数) */
export const SIGNATURE_TYPE_GNOSIS_SAFE = 2;

/** localStorage 中 API 凭证缓存的 key 前缀 */
export const CREDS_CACHE_PREFIX = "poly_creds_";

/** 空的 parentCollectionId (redeemPositions 使用) */
export const ZERO_PARENT_COLLECTION_ID = "0x0000000000000000000000000000000000000000000000000000000000000000";
