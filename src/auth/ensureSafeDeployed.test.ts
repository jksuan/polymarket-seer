import { describe, expect, it, vi, beforeEach } from "vitest";

const { getDeployed, deploy, wait } = vi.hoisted(() => ({
  getDeployed: vi.fn(),
  deploy: vi.fn(),
  wait: vi.fn(),
}));

vi.mock("@polymarket/builder-relayer-client", () => ({
  RelayClient: vi.fn(function RelayClientMock() {
    return {
      getDeployed,
      deploy,
    };
  }),
  RelayerTxType: { SAFE: "SAFE" },
}));

vi.mock(
  "@polymarket/builder-relayer-client/node_modules/@polymarket/builder-signing-sdk",
  () => ({
    BuilderConfig: class BuilderConfig {
      constructor(public config: unknown) {}
    },
  })
);

import { ensureSafeDeployed } from "./ensureSafeDeployed";

const TEST_PROXY = "0xAf4baFAFb78259e48d502abC9c480fAc070b3e6d";
const mockSigner = {} as import("ethers").Signer;

describe("ensureSafeDeployed", () => {
  beforeEach(() => {
    getDeployed.mockReset();
    deploy.mockReset();
    wait.mockReset();
    deploy.mockReturnValue({ wait });
  });

  it("Safe 已部署时跳过 deploy", async () => {
    getDeployed.mockResolvedValue(true);

    await ensureSafeDeployed(mockSigner, TEST_PROXY);

    expect(getDeployed).toHaveBeenCalledWith(TEST_PROXY);
    expect(deploy).not.toHaveBeenCalled();
  });

  it("Safe 未部署时调用 deploy 并等待确认", async () => {
    getDeployed.mockResolvedValue(false);

    await ensureSafeDeployed(mockSigner, TEST_PROXY);

    expect(deploy).toHaveBeenCalledOnce();
    expect(wait).toHaveBeenCalledOnce();
  });
});
