/** Connected 充值确认：用于在用户返回上一页或改选资产后丢弃仍在等待钱包的旧提交尝试 */

export type ConfirmAttemptGenerationRef = { current: number };

export function startConfirmAttempt(gen: ConfirmAttemptGenerationRef): number {
  gen.current += 1;
  return gen.current;
}

export function abandonConfirmAttempt(gen: ConfirmAttemptGenerationRef): void {
  gen.current += 1;
}

export function shouldApplyConfirmResult(
  attemptId: number,
  gen: ConfirmAttemptGenerationRef
): boolean {
  return attemptId === gen.current;
}
