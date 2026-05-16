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

  it("将 gas limit too high (cap) 映射为降低金额提示", () => {
    const message = formatExecutionError(
      new Error("transaction gas limit too high (cap: 33554432, tx: 49000000)"),
      "zh",
      "execute"
    );
    expect(message).toContain("无法为当前金额估算网络费");
    expect(message).not.toContain("预留");
  });

  it("将 gas required exceeds allowance 映射为余额不足", () => {
    const message = formatExecutionError(
      new Error("gas required exceeds allowance (88210000000000000000)"),
      "zh",
      "execute"
    );
    expect(message).toContain("余额不足");
    expect(message).not.toContain("预留");
  });

  it("从 MetaMask 嵌套 RPC 错误中提取 message", () => {
    const message = formatExecutionError(
      {
        code: -32603,
        message: "Internal JSON-RPC error",
        data: { message: "gas required exceeds allowance (1000000000000000000)" },
      },
      "zh",
      "execute"
    );
    expect(message).toContain("余额不足");
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
