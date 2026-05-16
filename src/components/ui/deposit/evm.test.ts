import { ethers } from "ethers";
import { describe, expect, it, vi } from "vitest";
import { sendPreparedEvmTx } from "./evm";

describe("sendPreparedEvmTx", () => {
  it("仅传 to/data/value，由钱包估算 gas，广播后立即返回 hash", async () => {
    const send = vi.fn().mockResolvedValue("0xabc");
    const getSigner = vi.fn().mockReturnValue({
      getAddress: vi.fn().mockResolvedValue("0x3333333333333333333333333333333333333333"),
    });
    const provider = { request: vi.fn() };
    const web3Provider = {
      getSigner,
      send,
      waitForTransaction: vi.fn(),
    };

    vi.spyOn(ethers.providers, "Web3Provider").mockImplementation(function MockWeb3Provider() {
      return web3Provider as unknown as ethers.providers.Web3Provider;
    });

    const hash = await sendPreparedEvmTx(provider, {
      to: "0x1111111111111111111111111111111111111111",
      data: "0x",
      value: ethers.utils.parseEther("1").toString(),
    });

    expect(hash).toBe("0xabc");
    const payload = send.mock.calls[0]?.[1]?.[0] as Record<string, unknown>;
    expect(payload.from).toBe("0x3333333333333333333333333333333333333333");
    expect(payload.to).toBe("0x1111111111111111111111111111111111111111");
    expect(payload.data).toBe("0x");
    expect(payload.gas).toBeUndefined();
    expect(payload.gasLimit).toBeUndefined();
    expect(web3Provider.waitForTransaction).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});
