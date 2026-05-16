import { ethers } from "ethers";
import { describe, expect, it, vi } from "vitest";
import {
  formatRpcQuantityHex,
  preflightWalletEstimateGas,
  sendPreparedEvmTx,
} from "./evm";

describe("formatRpcQuantityHex", () => {
  it("不使用带前导 0 的 quantity hex（Go RPC 要求）", () => {
    expect(formatRpcQuantityHex(10)).toBe("0xa");
    expect(formatRpcQuantityHex(ethers.BigNumber.from("0x0a"))).toBe("0xa");
    expect(formatRpcQuantityHex(0)).toBe("0x0");
    const pol33 = ethers.utils.parseEther("33.002");
    const encoded = formatRpcQuantityHex(pol33);
    expect(encoded.startsWith("0x0") && encoded !== "0x0").toBe(false);
  });
});

describe("sendPreparedEvmTx", () => {
  it("原生币：预检 estimateGas 后由 signer.sendTransaction 发送，不传 gasLimit", async () => {
    const sendTransaction = vi.fn().mockResolvedValue({
      hash: "0xabc",
      wait: vi.fn(),
    });
    const getSigner = vi.fn().mockReturnValue({
      getAddress: vi.fn().mockResolvedValue("0x3333333333333333333333333333333333333333"),
      getBalance: vi.fn().mockResolvedValue(ethers.utils.parseEther("40")),
      sendTransaction,
    });
    const request = vi.fn().mockImplementation(async (args: { method: string }) => {
      if (args.method === "eth_estimateGas") {
        return "0x5208";
      }
      return null;
    });
    const provider = { request };
    const web3Provider = {
      getSigner,
    };

    vi.spyOn(ethers.providers, "Web3Provider").mockImplementation(function MockWeb3Provider() {
      return web3Provider as unknown as ethers.providers.Web3Provider;
    });

    const hash = await sendPreparedEvmTx(provider, {
      to: "0x1111111111111111111111111111111111111111",
      data: "0x",
      value: ethers.utils.parseEther("33").toString(),
    });

    expect(hash).toBe("0xabc");
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ method: "eth_estimateGas" })
    );
    const txPayload = sendTransaction.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(txPayload.to).toBe("0x1111111111111111111111111111111111111111");
    expect(txPayload.gasLimit).toBeUndefined();

    vi.restoreAllMocks();
  });

  it("余额等于 value 时在发送前抛出 insufficient funds", async () => {
    const getSigner = vi.fn().mockReturnValue({
      getAddress: vi.fn().mockResolvedValue("0x3333333333333333333333333333333333333333"),
      getBalance: vi.fn().mockResolvedValue(ethers.utils.parseEther("33")),
    });
    const provider = { request: vi.fn() };
    const web3Provider = { getSigner };

    vi.spyOn(ethers.providers, "Web3Provider").mockImplementation(function MockWeb3Provider() {
      return web3Provider as unknown as ethers.providers.Web3Provider;
    });

    await expect(
      sendPreparedEvmTx(provider, {
        to: "0x1111111111111111111111111111111111111111",
        data: "0x",
        value: ethers.utils.parseEther("33").toString(),
      })
    ).rejects.toThrow(/insufficient funds/i);

    vi.restoreAllMocks();
  });
});

describe("preflightWalletEstimateGas", () => {
  it("将钱包 estimateGas 错误向上抛出", async () => {
    const provider = {
      request: vi.fn().mockRejectedValue({
        code: -32603,
        message: "transaction gas limit too high (cap: 33554432, tx: 49000000)",
      }),
    };

    await expect(
      preflightWalletEstimateGas(provider, {
        from: "0x3333333333333333333333333333333333333333",
        to: "0x1111111111111111111111111111111111111111",
        data: "0x",
        value: "0x1",
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining("gas limit too high"),
    });
  });
});
