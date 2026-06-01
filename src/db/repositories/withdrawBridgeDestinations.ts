import { getSql } from "@/db/client";
import { firstRow } from "@/db/rows";
import type { UpsertWithdrawDestinationInput } from "@/types/funds";

export async function upsertWithdrawBridgeDestination(
  privyUserId: string,
  input: UpsertWithdrawDestinationInput
): Promise<{ id: number }> {
  const sql = getSql();
  const rows = await sql`
    INSERT INTO withdraw_bridge_destinations (
      privy_user_id,
      proxy_address,
      to_chain_id,
      to_token_address,
      recipient_addr,
      bridge_evm,
      last_used_at
    )
    VALUES (
      ${privyUserId},
      ${input.proxyAddress},
      ${input.toChainId},
      ${input.toTokenAddress},
      ${input.recipientAddr},
      ${input.bridgeEvm ?? null},
      NOW()
    )
    ON CONFLICT (privy_user_id, to_chain_id, to_token_address, recipient_addr)
    DO UPDATE SET
      proxy_address = EXCLUDED.proxy_address,
      bridge_evm = COALESCE(EXCLUDED.bridge_evm, withdraw_bridge_destinations.bridge_evm),
      last_used_at = NOW()
    RETURNING id
  `;
  const row = firstRow<{ id: number }>(rows);
  return { id: Number(row?.id ?? 0) };
}
