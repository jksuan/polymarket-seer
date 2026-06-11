import { describe, expect, it } from "vitest";

import {
  canonicalCountryName,
  getCountryFlagUrl,
  getCountryGroup,
  isGroupStageMatch,
} from "./countryFlags";

describe("canonicalCountryName", () => {
  it("maps Bosnia API aliases to canonical name", () => {
    expect(canonicalCountryName("Bosnia-Herzegovina")).toBe("Bosnia and Herzegovina");
    expect(canonicalCountryName("BIH/ITA/NIR/WAL")).toBe("Bosnia and Herzegovina");
  });
});

describe("Bosnia flag and group metadata", () => {
  it("resolves flag code for aliases", () => {
    expect(getCountryFlagUrl("Bosnia-Herzegovina", "svg")).toContain("/ba.svg");
    expect(getCountryFlagUrl("BIH/ITA/NIR/WAL", "svg")).toContain("/ba.svg");
  });

  it("treats Canada vs Bosnia alias as Group B stage match", () => {
    expect(getCountryGroup("BIH/ITA/NIR/WAL")).toBe("B");
    expect(isGroupStageMatch("Canada", "Bosnia-Herzegovina")).toBe(true);
  });
});
