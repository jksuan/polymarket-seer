import type { UpsertUserWalletInput } from "@/types/funds";

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
