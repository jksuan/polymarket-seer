/** Polymarket CLOB L2 凭证（与 @polymarket/clob-client-v2 ApiKeyCreds 一致） */
export type ClobApiKeyCredsLike = {
  key?: string | null;
  secret?: string | null;
  passphrase?: string | null;
};

export function isValidApiKeyCreds(creds: ClobApiKeyCredsLike | null | undefined): creds is {
  key: string;
  secret: string;
  passphrase: string;
} {
  if (!creds) return false;
  return (
    typeof creds.key === "string" &&
    creds.key.length > 0 &&
    typeof creds.secret === "string" &&
    creds.secret.length > 0 &&
    typeof creds.passphrase === "string" &&
    creds.passphrase.length > 0
  );
}
