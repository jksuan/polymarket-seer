export function normalizeAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  return address.toLowerCase();
}

export function isAccountDrift(
  sessionAddress: string | null | undefined,
  currentExternalAddress: string | null | undefined
): boolean {
  const session = normalizeAddress(sessionAddress);
  const current = normalizeAddress(currentExternalAddress);
  if (!session || !current) return false;
  return session !== current;
}
