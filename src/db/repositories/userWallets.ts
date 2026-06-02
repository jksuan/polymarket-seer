import { getSql } from "@/db/client";
import { firstRow } from "@/db/rows";
import type { UpsertUserWalletInput } from "@/types/funds";

export async function upsertUserWallet(
  privyUserId: string,
  input: UpsertUserWalletInput
): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO user_wallets (privy_user_id, signer_address, proxy_address, session_mode, updated_at)
    VALUES (
      ${privyUserId},
      ${input.signerAddress},
      ${input.proxyAddress},
      ${input.sessionMode ?? null},
      NOW()
    )
    ON CONFLICT (privy_user_id) DO UPDATE SET
      signer_address = EXCLUDED.signer_address,
      proxy_address = EXCLUDED.proxy_address,
      session_mode = EXCLUDED.session_mode,
      updated_at = NOW()
  `;
}

export async function getUserWalletByPrivyId(privyUserId: string): Promise<{
  privyUserId: string;
  signerAddress: string;
  proxyAddress: string;
} | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT privy_user_id, signer_address, proxy_address
    FROM user_wallets
    WHERE privy_user_id = ${privyUserId}
    LIMIT 1
  `;
  const row = firstRow<{
    privy_user_id: string;
    signer_address: string;
    proxy_address: string;
  }>(rows);
  if (!row) return null;
  return {
    privyUserId: row.privy_user_id,
    signerAddress: row.signer_address,
    proxyAddress: row.proxy_address,
  };
}

export async function assertProxyOwnedByUser(
  privyUserId: string,
  proxyAddress: string
): Promise<boolean> {
  const wallet = await getUserWalletByPrivyId(privyUserId);
  if (!wallet) return false;
  return wallet.proxyAddress.toLowerCase() === proxyAddress.toLowerCase();
}
