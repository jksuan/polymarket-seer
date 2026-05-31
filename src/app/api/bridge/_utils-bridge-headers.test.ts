import { describe, expect, it, afterEach } from "vitest";

import { buildBridgeUpstreamHeaders } from "./_utils";

describe("buildBridgeUpstreamHeaders", () => {
  const original = process.env.POLY_BUILDER_CODE;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.POLY_BUILDER_CODE;
    } else {
      process.env.POLY_BUILDER_CODE = original;
    }
  });

  it("未配置 POLY_BUILDER_CODE 时不发送 X-Builder-Code", () => {
    delete process.env.POLY_BUILDER_CODE;
    expect(buildBridgeUpstreamHeaders()["X-Builder-Code"]).toBeUndefined();
    expect(buildBridgeUpstreamHeaders().Accept).toBe("application/json");
  });

  it("配置 POLY_BUILDER_CODE 时附带 X-Builder-Code", () => {
    process.env.POLY_BUILDER_CODE = "0xacd5cdab27bba09bd256daca2419b88b453c3776913294c18ec54a7b8a85d536";
    expect(buildBridgeUpstreamHeaders()["X-Builder-Code"]).toBe(
      "0xacd5cdab27bba09bd256daca2419b88b453c3776913294c18ec54a7b8a85d536"
    );
  });
});
