import { ethers } from "ethers";
import { describe, expect, it } from "vitest";
import {
  clampNativeTransferValue,
  isSimpleNativeTransferTx,
  SIMPLE_NATIVE_TRANSFER_GAS_LIMIT,
} from "./nativeGas";

describe("nativeGas", () => {
  it("识别简单原生币转账", () => {
    expect(
      isSimpleNativeTransferTx({
        data: "0x",
        value: ethers.utils.parseEther("1").toString(),
      })
    ).toBe(true);
    expect(
      isSimpleNativeTransferTx({
        data: "0xdead",
        value: "1",
      })
    ).toBe(false);
  });

  it("余额不足预留 gas 时返回 insufficient_for_gas", () => {
    const balance = ethers.utils.parseEther("1");
    const reserve = ethers.utils.parseEther("0.05");
    const requested = ethers.utils.parseEther("0.99");

    const result = clampNativeTransferValue({
      balanceWei: balance,
      requestedValueWei: requested,
      gasReserveWei: reserve,
    });

    expect(result.error).toBeNull();
    expect(result.wasClamped).toBe(true);
    expect(result.valueWei.lte(balance.sub(reserve))).toBe(true);
  });

  it("余额充足时保留请求金额", () => {
    const balance = ethers.utils.parseEther("10");
    const reserve = ethers.utils.parseEther("0.05");
    const requested = ethers.utils.parseEther("3");

    const result = clampNativeTransferValue({
      balanceWei: balance,
      requestedValueWei: requested,
      gasReserveWei: reserve,
    });

    expect(result.error).toBeNull();
    expect(result.wasClamped).toBe(false);
    expect(result.valueWei.toString()).toBe(requested.toString());
  });

  it("SIMPLE_NATIVE_TRANSFER_GAS_LIMIT 为 21000", () => {
    expect(SIMPLE_NATIVE_TRANSFER_GAS_LIMIT).toBe(21_000);
  });
});
