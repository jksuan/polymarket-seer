import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SportMarket } from "@/types/sports";
import { ConfirmModal } from "./ConfirmModal";

let sessionEpoch = 1;

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({
    ready: true,
    authenticated: true,
    login: vi.fn(),
    user: { wallet: { address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" } },
  }),
}));

vi.mock("@/contexts/PolymarketAuthContext", () => ({
  usePolymarketAuth: () => ({
    usdcBalance: "100.00",
    isRefreshingBalance: false,
    sessionEpoch,
  }),
}));

vi.mock("@/i18n", async () => {
  const z = (await import("@/i18n/locales/zh")).default;
  return {
    useTranslation: () => ({ locale: "zh" as const, setLocale: vi.fn(), t: z }),
    translateCountryName: (name: string) => name,
  };
});

vi.mock("swr", () => ({
  default: () => ({ data: null, isLoading: false, error: undefined }),
}));

const minimalMarket: SportMarket = {
  id: "m1",
  question: "Test market",
  sport: "soccer",
  leagueCode: "wc",
  leagueName: "WC",
  leagueNameEn: "WC",
  status: "upcoming",
  matchTime: "",
  matchTimeISO: "",
  homeTeam: {
    shortName: "H",
    fullName: "Home",
    displayName: "Home",
    primaryColor: "#111",
    accentColor: "#222",
    glowColor: "#333",
  },
  awayTeam: {
    shortName: "A",
    fullName: "Away",
    displayName: "Away",
    primaryColor: "#444",
    accentColor: "#555",
    glowColor: "#666",
  },
  homeProbability: 55,
  awayProbability: 45,
  homeOdds: 1.82,
  awayOdds: 2.2,
  volume: 0,
  liquidity: 0,
  supporters: 0,
  isHot: false,
  isFeatured: false,
};

describe("ConfirmModal", () => {
  beforeEach(() => {
    sessionEpoch = 1;
  });

  it("sessionEpoch 递增时若交易终端仍打开则调用 onCancel 以关闭抽屉", async () => {
    const onCancel = vi.fn();
    const { rerender } = render(
      <ConfirmModal
        isOpen
        market={minimalMarket}
        side="home"
        onConfirm={vi.fn()}
        onCancel={onCancel}
        tokenId="token-yes-1"
      />
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain("交易终端");
    });

    sessionEpoch = 2;
    rerender(
      <ConfirmModal
        isOpen
        market={minimalMarket}
        side="home"
        onConfirm={vi.fn()}
        onCancel={onCancel}
        tokenId="token-yes-1"
      />
    );

    await waitFor(() => {
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });
});
