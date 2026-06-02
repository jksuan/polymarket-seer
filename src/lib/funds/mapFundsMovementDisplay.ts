import type { FundsMovementListItem, FundsMovementType } from "@/types/funds";

export type FundsMovementDisplayLabels = {
  txDeposit: string;
  txWithdraw: string;
};

export type FundsMovementDisplayRow = {
  key: string;
  movementType: FundsMovementType;
  label: string;
  amountDisplay: string;
  amtColor: string;
  txColor: string;
  txBg: string;
  timeStr: string;
  status: FundsMovementListItem["status"];
};

export function formatFundsOccurredAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${day} ${h}:${min}`;
}

function formatUsdAmount(amountUsd: number, movementType: FundsMovementType): string {
  const fixed = amountUsd.toFixed(2);
  if (movementType === "deposit") {
    return `+$${fixed}`;
  }
  return `-$${fixed}`;
}

export function mapFundsMovementDisplay(
  item: FundsMovementListItem,
  labels: FundsMovementDisplayLabels,
  index: number
): FundsMovementDisplayRow {
  const isDeposit = item.movementType === "deposit";
  const label = isDeposit ? labels.txDeposit : labels.txWithdraw;
  const amountDisplay = formatUsdAmount(item.amountUsd, item.movementType);
  const amtColor = isDeposit ? "#6bff8f" : "#ff6b6b";
  const txColor = isDeposit ? "#6bff8f" : "#ff9f6b";
  const txBg = isDeposit ? "rgba(107,255,143,0.12)" : "rgba(255,159,107,0.12)";

  return {
    key: `${item.movementType}:${item.occurredAt}:${index}`,
    movementType: item.movementType,
    label,
    amountDisplay,
    amtColor,
    txColor,
    txBg,
    timeStr: formatFundsOccurredAt(item.occurredAt),
    status: item.status,
  };
}

export function mapFundsMovementList(
  items: FundsMovementListItem[],
  labels: FundsMovementDisplayLabels
): FundsMovementDisplayRow[] {
  return items.map((item, index) => mapFundsMovementDisplay(item, labels, index));
}
