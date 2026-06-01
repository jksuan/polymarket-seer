import { getSql } from "@/db/client";
import type { UpsertDepositBridgesInput } from "@/types/funds";

export async function upsertUserDepositBridges(
  privyUserId: string,
  input: UpsertDepositBridgesInput
): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO user_deposit_bridges (
      privy_user_id,
      proxy_address,
      evm_address,
      svm_address,
      tron_address,
      btc_address,
      updated_at
    )
    VALUES (
      ${privyUserId},
      ${input.proxyAddress},
      ${input.evmAddress ?? null},
      ${input.svmAddress ?? null},
      ${input.tronAddress ?? null},
      ${input.btcAddress ?? null},
      NOW()
    )
    ON CONFLICT (privy_user_id) DO UPDATE SET
      proxy_address = EXCLUDED.proxy_address,
      evm_address = COALESCE(EXCLUDED.evm_address, user_deposit_bridges.evm_address),
      svm_address = COALESCE(EXCLUDED.svm_address, user_deposit_bridges.svm_address),
      tron_address = COALESCE(EXCLUDED.tron_address, user_deposit_bridges.tron_address),
      btc_address = COALESCE(EXCLUDED.btc_address, user_deposit_bridges.btc_address),
      updated_at = NOW()
  `;
}
