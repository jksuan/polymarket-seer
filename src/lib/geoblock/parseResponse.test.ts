import { describe, expect, it } from "vitest";
import { parseGeoblockBody } from "./parseResponse";

describe("parseGeoblockBody", () => {
  it("parses valid geoblock JSON", () => {
    expect(
      parseGeoblockBody(
        JSON.stringify({ blocked: false, ip: "1.2.3.4", country: "HK", region: "HKG" })
      )
    ).toEqual({
      blocked: false,
      ip: "1.2.3.4",
      country: "HK",
      region: "HKG",
    });
  });

  it("returns null when blocked is missing", () => {
    expect(parseGeoblockBody(JSON.stringify({ country: "US" }))).toBeNull();
  });
});
