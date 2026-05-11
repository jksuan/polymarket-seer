import { describe, expect, it, vi } from "vitest";
import * as bridgeModule from "@/hooks/useBridge";
import type { CreateDepositResponse } from "@/types/bridge";
import {
  depositAddressMatchesType,
  ensureEvmDepositAddress,
  extractAnyDepositAddress,
  extractDepositAddress,
  extractDepositAddressMap,
} from "./addresses";

describe("deposit addresses helpers", () => {
  it("depositAddressMatchesType 拒绝链类型与地址格式不一致", () => {
    const svm = "6VxkherHLzE3kAnU1nTt8MLRvE2Lc5DGw3pSGCUYJb5Q";
    const evm = "0x1111111111111111111111111111111111111111";
    expect(depositAddressMatchesType(svm, "svm")).toBe(true);
    expect(depositAddressMatchesType(svm, "evm")).toBe(false);
    expect(depositAddressMatchesType(evm, "evm")).toBe(true);
    expect(depositAddressMatchesType(evm, "svm")).toBe(false);
  });

  it("extractDepositAddressMap 能提取多链地址", () => {
    const response: CreateDepositResponse = {
      depositAddresses: {
        evm: "0x1111111111111111111111111111111111111111",
        svm: "So11111111111111111111111111111111111111112",
        btc: "bc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqmql8k8",
      },
    };

    expect(extractDepositAddressMap(response)).toEqual({
      evm: "0x1111111111111111111111111111111111111111",
      svm: "So11111111111111111111111111111111111111112",
      btc: "bc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqmql8k8",
    });
  });

  it("extractAnyDepositAddress 会返回第一个可用地址", () => {
    const response: CreateDepositResponse = {
      depositAddresses: {
        tron: "TKP6xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      },
    };

    expect(extractAnyDepositAddress(response)).toBe("TKP6xxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
    expect(extractDepositAddress(response, "evm")).toBe("");
  });

  it("ensureEvmDepositAddress 优先复用现有有效地址", async () => {
    const onAddress = vi.fn();
    const onResponse = vi.fn();

    const address = await ensureEvmDepositAddress({
      existingAddress: "0x1111111111111111111111111111111111111111",
      onAddress,
      onResponse,
      proxyAddress: "0x2222222222222222222222222222222222222222",
    });

    expect(address).toBe("0x1111111111111111111111111111111111111111");
    expect(onAddress).not.toHaveBeenCalled();
    expect(onResponse).not.toHaveBeenCalled();
  });

  it("ensureEvmDepositAddress 在无地址时调用创建接口并返回 evm 地址", async () => {
    const onAddress = vi.fn();
    const onResponse = vi.fn();
    const createSpy = vi
      .spyOn(bridgeModule, "createDepositAddress")
      .mockResolvedValue({
        depositAddresses: {
          evm: "0x3333333333333333333333333333333333333333",
        },
      });

    const address = await ensureEvmDepositAddress({
      existingAddress: "",
      onAddress,
      onResponse,
      proxyAddress: "0x2222222222222222222222222222222222222222",
    });

    expect(address).toBe("0x3333333333333333333333333333333333333333");
    expect(onAddress).toHaveBeenCalledWith("0x3333333333333333333333333333333333333333");
    expect(onResponse).toHaveBeenCalled();
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        address: "0x2222222222222222222222222222222222222222",
        requestedAddressTypes: ["evm", "svm"],
      })
    );

    createSpy.mockRestore();
  });
});
