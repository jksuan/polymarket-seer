import { describe, expect, it } from "vitest";
import { resolveTokenIconUrl } from "./icons";

describe("resolveTokenIconUrl", () => {
  it("本地映射优先于后端图标", () => {
    const resolved = resolveTokenIconUrl("ETH", "https://example.com/eth.png");
    expect(resolved).toBe("/images/crypto/ethereum-eth.svg");
  });

  it("本地缺失时回退到后端图标", () => {
    const apiIcon = "https://example.com/unknown.png";
    const resolved = resolveTokenIconUrl("UNKNOWN", apiIcon);
    expect(resolved).toBe(apiIcon);
  });

  it("本地与后端都缺失时启发式兜底", () => {
    expect(resolveTokenIconUrl("USDC.e")).toBe("/images/crypto/usdc.svg");
    expect(resolveTokenIconUrl("Wrapped ETH")).toBe("/images/crypto/ethereum-eth.svg");
  });
});
