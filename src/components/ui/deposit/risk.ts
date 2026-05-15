import type { ExecutionSnapshot } from "./types";

/** Connected 确认页：发送与预估到账美元偏差过大时要求用户确认 */
export function isHighWalletMismatchRisk(snapshot: ExecutionSnapshot): boolean {
  if (snapshot.kind === "direct-transfer") return false;
  const sendUsd = snapshot.sendUsd;
  const receiveUsd = snapshot.receiveUsd;
  if (!Number.isFinite(sendUsd) || !Number.isFinite(receiveUsd)) return false;
  if ((sendUsd ?? 0) < 5) return false;
  const diffRatio = Math.abs((sendUsd ?? 0) - (receiveUsd ?? 0)) / (sendUsd ?? 1);
  return diffRatio > 0.2;
}
