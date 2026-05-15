import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  EXTERNAL_ACCOUNT_DRIFT_DEBOUNCE_MS,
  createAccountDriftProcessor,
} from "./accountDriftProcessor";

describe("createAccountDriftProcessor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("会话地址与 provider 地址一致时不触发 onDriftDetected", () => {
    const onDriftDetected = vi.fn();
    const { processAccountCandidate } = createAccountDriftProcessor({
      sessionAddress: "0xAaaA000000000000000000000000000000000001",
      onDriftDetected,
    });

    processAccountCandidate("0xaaaa000000000000000000000000000000000001");
    vi.advanceTimersByTime(EXTERNAL_ACCOUNT_DRIFT_DEBOUNCE_MS);

    expect(onDriftDetected).not.toHaveBeenCalled();
  });

  it("地址漂移且防抖结束后触发 onDriftDetected", () => {
    const onDriftDetected = vi.fn();
    const { processAccountCandidate } = createAccountDriftProcessor({
      sessionAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      onDriftDetected,
    });

    processAccountCandidate("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
    vi.advanceTimersByTime(EXTERNAL_ACCOUNT_DRIFT_DEBOUNCE_MS - 1);
    expect(onDriftDetected).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onDriftDetected).toHaveBeenCalledTimes(1);
  });

  it("连续变更会重置防抖计时", () => {
    const onDriftDetected = vi.fn();
    const { processAccountCandidate } = createAccountDriftProcessor({
      sessionAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      onDriftDetected,
    });

    processAccountCandidate("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
    vi.advanceTimersByTime(200);
    processAccountCandidate("0xcccccccccccccccccccccccccccccccccccccccc");
    vi.advanceTimersByTime(EXTERNAL_ACCOUNT_DRIFT_DEBOUNCE_MS - 1);
    expect(onDriftDetected).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onDriftDetected).toHaveBeenCalledTimes(1);
  });

  it("取消后不再触发 onDriftDetected", () => {
    const onDriftDetected = vi.fn();
    let cancelled = false;
    const { processAccountCandidate } = createAccountDriftProcessor({
      sessionAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      onDriftDetected,
      getIsCancelled: () => cancelled,
    });

    processAccountCandidate("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
    cancelled = true;
    vi.advanceTimersByTime(EXTERNAL_ACCOUNT_DRIFT_DEBOUNCE_MS);

    expect(onDriftDetected).not.toHaveBeenCalled();
  });
});
