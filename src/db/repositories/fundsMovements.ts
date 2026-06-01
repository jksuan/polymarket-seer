import { getSql } from "@/db/client";
import { allRows, firstRow } from "@/db/rows";
import type {
  FundsMovementListItem,
  FundsMovementStatus,
  FundsMovementType,
  RecordFundsMovementInput,
} from "@/types/funds";

function mapListRow(row: {
  movement_type: string;
  amount_usd: string | number;
  occurred_at: Date | string;
  status: string;
}): FundsMovementListItem {
  return {
    movementType: row.movement_type as FundsMovementType,
    amountUsd: Number(row.amount_usd),
    occurredAt:
      row.occurred_at instanceof Date
        ? row.occurred_at.toISOString()
        : String(row.occurred_at),
    status: row.status as FundsMovementStatus,
  };
}

export async function listFundsMovementsForUser(
  privyUserId: string,
  limit = 100
): Promise<FundsMovementListItem[]> {
  const sql = getSql();
  const safeLimit = Math.min(Math.max(1, limit), 200);
  const rows = await sql`
    SELECT movement_type, amount_usd, occurred_at, status
    FROM funds_movements
    WHERE privy_user_id = ${privyUserId}
    ORDER BY occurred_at DESC
    LIMIT ${safeLimit}
  `;
  return allRows<{
    movement_type: string;
    amount_usd: string | number;
    occurred_at: Date | string;
    status: string;
  }>(rows).map(mapListRow);
}

export async function insertFundsMovement(
  privyUserId: string,
  input: RecordFundsMovementInput
): Promise<{ inserted: boolean; movement: FundsMovementListItem }> {
  const sql = getSql();
  const occurredAt =
    typeof input.occurredAt === "number"
      ? new Date(input.occurredAt < 1e12 ? input.occurredAt * 1000 : input.occurredAt).toISOString()
      : input.occurredAt;

  const rawPayload =
    input.rawBridgeTransaction === undefined ? null : input.rawBridgeTransaction;

  try {
    const rows = await sql`
      INSERT INTO funds_movements (
        privy_user_id,
        proxy_address,
        movement_type,
        status,
        amount_usd,
        occurred_at,
        idempotency_key,
        from_chain_id,
        to_chain_id,
        from_token_address,
        to_token_address,
        token_symbol,
        token_decimals,
        from_amount_base_unit,
        bridge_status_address,
        source_address,
        recipient_addr,
        tx_hash,
        raw_bridge_transaction
      )
      VALUES (
        ${privyUserId},
        ${input.proxyAddress},
        ${input.movementType},
        ${input.status},
        ${input.amountUsd},
        ${occurredAt},
        ${input.idempotencyKey},
        ${input.fromChainId ?? null},
        ${input.toChainId ?? null},
        ${input.fromTokenAddress ?? null},
        ${input.toTokenAddress ?? null},
        ${input.tokenSymbol ?? null},
        ${input.tokenDecimals ?? null},
        ${input.fromAmountBaseUnit ?? null},
        ${input.bridgeStatusAddress ?? null},
        ${input.sourceAddress ?? null},
        ${input.recipientAddr ?? null},
        ${input.txHash ?? null},
        ${rawPayload}
      )
      RETURNING movement_type, amount_usd, occurred_at, status
    `;
    const row = firstRow<{
      movement_type: string;
      amount_usd: string | number;
      occurred_at: Date | string;
      status: string;
    }>(rows);
    if (!row) throw new Error("Insert returned no row");
    return { inserted: true, movement: mapListRow(row) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("unique") && !message.includes("duplicate")) {
      throw error;
    }
  }

  const existing = await sql`
    SELECT movement_type, amount_usd, occurred_at, status
    FROM funds_movements
    WHERE idempotency_key = ${input.idempotencyKey}
    LIMIT 1
  `;
  const row = firstRow<{
    movement_type: string;
    amount_usd: string | number;
    occurred_at: Date | string;
    status: string;
  }>(existing);
  if (!row) throw new Error("Failed to upsert funds movement");
  return { inserted: false, movement: mapListRow(row) };
}
