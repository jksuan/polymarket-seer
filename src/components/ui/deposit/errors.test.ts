import { describe, expect, it } from "vitest";
import { formatExecutionError } from "./errors";

describe("formatExecutionError", () => {
  it("将 -32603 签名失败映射为中文提示", () => {
    const message = formatExecutionError(
      new Error('Failed to sign transaction {"eipCode":-32603,"message":"Internal error"}'),
      "zh",
      "execute"
    );
    expect(message).toContain("钱包无法签名");
    expect(message).not.toContain("-32603");
  });

  it("将 providers 超时映射为已提交待确认提示", () => {
    const message = formatExecutionError(
      new Error("timeout exceeded (timeout=90000, code=TIMEOUT, version=providers/5.8.0)"),
      "zh",
      "execute"
    );
    expect(message).toContain("已提交");
  });
});
