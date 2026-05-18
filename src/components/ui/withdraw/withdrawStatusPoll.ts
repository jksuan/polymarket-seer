export function isWithdrawStatusPollTimedOut(
  startedAtMs: number | null,
  isFinal: boolean,
  nowMs: number,
  timeoutMs: number
): boolean {
  if (!startedAtMs || isFinal) return false;
  return nowMs - startedAtMs > timeoutMs;
}
