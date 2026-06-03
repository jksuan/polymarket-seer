import { describe, expect, it } from "vitest";

import { resolveClientIp } from "./clientIp";

describe("resolveClientIp", () => {
  it("优先取 x-forwarded-for 首段", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });
    expect(resolveClientIp(req)).toBe("203.0.113.1");
  });

  it("回退 x-real-ip", () => {
    const req = new Request("https://example.com", {
      headers: { "x-real-ip": "198.51.100.2" },
    });
    expect(resolveClientIp(req)).toBe("198.51.100.2");
  });
});
