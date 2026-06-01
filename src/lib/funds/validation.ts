import type {
  FundsMovementStatus,
  FundsMovementType,
  RecordFundsMovementInput,
  UpsertDepositBridgesInput,
  UpsertUserWalletInput,
  UpsertWithdrawDestinationInput,
} from "@/types/funds";

const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export function normalizeEvmAddress(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEvmAddress(value: string): boolean {
  return EVM_ADDRESS_REGEX.test(value.trim());
}

export function parseUserWalletBody(body: Record<string, unknown>):
  | { ok: true; value: UpsertUserWalletInput }
  | { ok: false; error: string } {
  const signerAddress = typeof body.signerAddress === "string" ? body.signerAddress.trim() : "";
  const proxyAddress = typeof body.proxyAddress === "string" ? body.proxyAddress.trim() : "";
  if (!isValidEvmAddress(signerAddress)) {
    return { ok: false, error: "signerAddress must be a valid EVM address" };
  }
  if (!isValidEvmAddress(proxyAddress)) {
    return { ok: false, error: "proxyAddress must be a valid EVM address" };
  }
  const sessionMode =
    typeof body.sessionMode === "string" && body.sessionMode.trim()
      ? body.sessionMode.trim()
      : null;
  return {
    ok: true,
    value: {
      signerAddress: normalizeEvmAddress(signerAddress),
      proxyAddress: normalizeEvmAddress(proxyAddress),
      sessionMode,
    },
  };
}

function optionalAddressField(
  body: Record<string, unknown>,
  key: string
): string | null {
  const raw = body[key];
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

export function parseDepositBridgesBody(body: Record<string, unknown>):
  | { ok: true; value: UpsertDepositBridgesInput }
  | { ok: false; error: string } {
  const proxyAddress = typeof body.proxyAddress === "string" ? body.proxyAddress.trim() : "";
  if (!isValidEvmAddress(proxyAddress)) {
    return { ok: false, error: "proxyAddress must be a valid EVM address" };
  }
  return {
    ok: true,
    value: {
      proxyAddress: normalizeEvmAddress(proxyAddress),
      evmAddress: optionalAddressField(body, "evmAddress"),
      svmAddress: optionalAddressField(body, "svmAddress"),
      tronAddress: optionalAddressField(body, "tronAddress"),
      btcAddress: optionalAddressField(body, "btcAddress"),
    },
  };
}

export function parseWithdrawDestinationBody(body: Record<string, unknown>):
  | { ok: true; value: UpsertWithdrawDestinationInput }
  | { ok: false; error: string } {
  const proxyAddress = typeof body.proxyAddress === "string" ? body.proxyAddress.trim() : "";
  const toChainId = typeof body.toChainId === "string" ? body.toChainId.trim() : "";
  const toTokenAddress =
    typeof body.toTokenAddress === "string" ? body.toTokenAddress.trim() : "";
  const recipientAddr =
    typeof body.recipientAddr === "string" ? body.recipientAddr.trim() : "";

  if (!isValidEvmAddress(proxyAddress)) {
    return { ok: false, error: "proxyAddress must be a valid EVM address" };
  }
  if (!toChainId) return { ok: false, error: "toChainId is required" };
  if (!toTokenAddress) return { ok: false, error: "toTokenAddress is required" };
  if (!isValidEvmAddress(recipientAddr)) {
    return { ok: false, error: "recipientAddr must be a valid EVM address" };
  }

  const bridgeEvm = optionalAddressField(body, "bridgeEvm");
  if (bridgeEvm && !isValidEvmAddress(bridgeEvm)) {
    return { ok: false, error: "bridgeEvm must be a valid EVM address when provided" };
  }

  return {
    ok: true,
    value: {
      proxyAddress: normalizeEvmAddress(proxyAddress),
      toChainId,
      toTokenAddress: normalizeEvmAddress(toTokenAddress),
      recipientAddr: normalizeEvmAddress(recipientAddr),
      bridgeEvm: bridgeEvm ? normalizeEvmAddress(bridgeEvm) : null,
    },
  };
}

const MOVEMENT_TYPES = new Set<FundsMovementType>(["deposit", "withdraw"]);
const MOVEMENT_STATUSES = new Set<FundsMovementStatus>([
  "completed",
  "failed",
  "processing",
]);

export function parseOccurredAt(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms).toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

export function parseRecordMovementBody(body: Record<string, unknown>):
  | { ok: true; value: RecordFundsMovementInput }
  | { ok: false; error: string } {
  const proxyAddress = typeof body.proxyAddress === "string" ? body.proxyAddress.trim() : "";
  const movementType = body.movementType;
  const status = body.status;
  const idempotencyKey =
    typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";

  if (!isValidEvmAddress(proxyAddress)) {
    return { ok: false, error: "proxyAddress must be a valid EVM address" };
  }
  if (typeof movementType !== "string" || !MOVEMENT_TYPES.has(movementType as FundsMovementType)) {
    return { ok: false, error: "movementType must be deposit or withdraw" };
  }
  if (typeof status !== "string" || !MOVEMENT_STATUSES.has(status as FundsMovementStatus)) {
    return { ok: false, error: "status must be completed, failed, or processing" };
  }
  if (!idempotencyKey || idempotencyKey.length > 512) {
    return { ok: false, error: "idempotencyKey is required (max 512 chars)" };
  }

  const amountUsd = Number(body.amountUsd);
  if (!Number.isFinite(amountUsd) || amountUsd < 0) {
    return { ok: false, error: "amountUsd must be a non-negative number" };
  }

  const occurredAt = parseOccurredAt(body.occurredAt);
  if (!occurredAt) {
    return { ok: false, error: "occurredAt must be a valid ISO string or unix timestamp" };
  }

  const tokenDecimalsRaw = body.tokenDecimals;
  let tokenDecimals: number | null = null;
  if (tokenDecimalsRaw !== undefined && tokenDecimalsRaw !== null) {
    const n = Number(tokenDecimalsRaw);
    if (!Number.isInteger(n) || n < 0 || n > 36) {
      return { ok: false, error: "tokenDecimals must be an integer between 0 and 36" };
    }
    tokenDecimals = n;
  }

  const bridgeEvm = optionalAddressField(body, "bridgeStatusAddress");
  if (bridgeEvm && !isValidEvmAddress(bridgeEvm)) {
    return { ok: false, error: "bridgeStatusAddress must be a valid EVM address when provided" };
  }

  const sourceAddress = optionalAddressField(body, "sourceAddress");
  if (sourceAddress && !isValidEvmAddress(sourceAddress)) {
    return { ok: false, error: "sourceAddress must be a valid EVM address when provided" };
  }

  const recipientAddr = optionalAddressField(body, "recipientAddr");
  if (recipientAddr && !isValidEvmAddress(recipientAddr)) {
    return { ok: false, error: "recipientAddr must be a valid EVM address when provided" };
  }

  return {
    ok: true,
    value: {
      proxyAddress: normalizeEvmAddress(proxyAddress),
      movementType: movementType as FundsMovementType,
      status: status as FundsMovementStatus,
      amountUsd,
      occurredAt,
      idempotencyKey,
      fromChainId: optionalString(body, "fromChainId"),
      toChainId: optionalString(body, "toChainId"),
      fromTokenAddress: optionalString(body, "fromTokenAddress"),
      toTokenAddress: optionalString(body, "toTokenAddress"),
      tokenSymbol: optionalString(body, "tokenSymbol"),
      tokenDecimals,
      fromAmountBaseUnit: optionalString(body, "fromAmountBaseUnit"),
      bridgeStatusAddress: bridgeEvm ? normalizeEvmAddress(bridgeEvm) : null,
      sourceAddress: sourceAddress ? normalizeEvmAddress(sourceAddress) : null,
      recipientAddr: recipientAddr ? normalizeEvmAddress(recipientAddr) : null,
      txHash: optionalString(body, "txHash"),
      rawBridgeTransaction: body.rawBridgeTransaction,
    },
  };
}

function optionalString(body: Record<string, unknown>, key: string): string | null {
  const raw = body[key];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

export function buildDefaultIdempotencyKey(parts: {
  movementType: FundsMovementType;
  status: FundsMovementStatus;
  bridgeStatusAddress?: string | null;
  txHash?: string | null;
  occurredAt: string;
}): string {
  const addr = (parts.bridgeStatusAddress || "no-bridge").toLowerCase();
  const hash = (parts.txHash || "no-hash").toLowerCase();
  return `${parts.movementType}:${parts.status}:${addr}:${hash}:${parts.occurredAt}`;
}
