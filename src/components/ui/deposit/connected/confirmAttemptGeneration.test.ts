import { describe, expect, it } from "vitest";
import {
  abandonConfirmAttempt,
  shouldApplyConfirmResult,
  startConfirmAttempt,
} from "./confirmAttemptGeneration";

describe("confirmAttemptGeneration", () => {
  it("用户放弃后不应再应用上一笔提交的到账写入", () => {
    const gen = { current: 0 };
    const attemptId = startConfirmAttempt(gen);
    abandonConfirmAttempt(gen);
    expect(shouldApplyConfirmResult(attemptId, gen)).toBe(false);
  });

  it("未放弃时同一笔尝试仍应应用", () => {
    const gen = { current: 0 };
    const attemptId = startConfirmAttempt(gen);
    expect(shouldApplyConfirmResult(attemptId, gen)).toBe(true);
  });

  it("连续两次提交会得到不同的 attemptId", () => {
    const gen = { current: 0 };
    const a = startConfirmAttempt(gen);
    const b = startConfirmAttempt(gen);
    expect(a).not.toBe(b);
    expect(shouldApplyConfirmResult(b, gen)).toBe(true);
    expect(shouldApplyConfirmResult(a, gen)).toBe(false);
  });
});
