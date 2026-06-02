import { describe, expect, it } from "vitest";
import { ADDRESSES } from "@/lib/constants";
import {
  classifyDepositWithdraw,
  isCollateralTokenAddress,
  isDeniedCounterparty,
  isExcludedFundsTabMethodId,
  isExcludedFundsTabTransaction,
  listCollateralMovementsFromTransfers,
  parseTokenAmountUsd,
  TX_METHOD_HANDLE_OPS,
  TX_METHOD_MATCH_ORDERS,
  TX_METHOD_PROXY,
  type EtherscanTokenTransfer,
} from "./polygonTokenTransfers";

const PROXY = "0x6f15f5309e10464d232a861c7aca76ba414babea";

function transfer(partial: Partial<EtherscanTokenTransfer>): EtherscanTokenTransfer {
  return {
    blockNumber: "1",
    timeStamp: "1717200000",
    hash: "0xhash",
    from: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    to: PROXY,
    value: "1000000",
    tokenSymbol: "PUSD",
    tokenDecimal: "6",
    contractAddress: ADDRESSES.pUSD,
    logIndex: "0",
    ...partial,
  };
}

describe("polygonTokenTransfers", () => {
  it("accepts pUSD and USDC.e as collateral tokens", () => {
    expect(isCollateralTokenAddress(ADDRESSES.pUSD)).toBe(true);
    expect(isCollateralTokenAddress(ADDRESSES.USDCe)).toBe(true);
    expect(isCollateralTokenAddress(ADDRESSES.CTF)).toBe(false);
  });

  it("denies exchange and CTF counterparties", () => {
    expect(isDeniedCounterparty(ADDRESSES.CTF_EXCHANGE_V2)).toBe(true);
    expect(isDeniedCounterparty("0xcccccccccccccccccccccccccccccccccccccccc")).toBe(false);
  });

  it("classifies inbound collateral as deposit", () => {
    const item = classifyDepositWithdraw(transfer({ to: PROXY }), PROXY);
    expect(item?.movementType).toBe("deposit");
    expect(item?.amountUsd).toBe(1);
  });

  it("classifies outbound collateral as withdraw", () => {
    const item = classifyDepositWithdraw(
      transfer({ from: PROXY, to: "0xdddddddddddddddddddddddddddddddddddddddd" }),
      PROXY
    );
    expect(item?.movementType).toBe("withdraw");
  });

  it("ignores exchange-bound pUSD transfers", () => {
    const item = classifyDepositWithdraw(
      transfer({
        from: PROXY,
        to: ADDRESSES.CTF_EXCHANGE_V2,
        contractAddress: ADDRESSES.pUSD,
      }),
      PROXY
    );
    expect(item).toBeNull();
  });

  it("parses token amount with decimals", () => {
    expect(parseTokenAmountUsd("2500000", "6")).toBe(2.5);
  });

  it("recognizes matchOrders methodId as excluded", () => {
    expect(isExcludedFundsTabMethodId(TX_METHOD_MATCH_ORDERS)).toBe(true);
    expect(isExcludedFundsTabMethodId(TX_METHOD_PROXY)).toBe(false);
    expect(isExcludedFundsTabMethodId(TX_METHOD_HANDLE_OPS)).toBe(false);
  });

  it("excludes entire matchOrders tx hash from funds tab (buy sample 0xb553…)", () => {
    const hash = "0xb553e829d22a3a137daa1f3643e2634ca259b83397543f9f4c2769f6765f27c5";
    const matchOrdersMeta = {
      hash,
      methodId: TX_METHOD_MATCH_ORDERS,
      functionName:
        "matchOrders(bytes32 conditionId,tuple takerOrder,tuple[] makerOrders,uint256 takerFillAmount,uint256[] makerFillAmounts,uint256 takerFeeAmount,uint256[] makerFeeAmounts)",
    };
    const transfers: EtherscanTokenTransfer[] = [
      transfer({
        ...matchOrdersMeta,
        from: PROXY,
        to: "0x41f7527b6dfbbbd5a839fadd7175def6b6fac4e4",
        value: "999999",
        logIndex: "636",
      }),
      transfer({
        ...matchOrdersMeta,
        from: PROXY,
        to: "0x115f48dc2a731aa16251c6d6e1befc42f92accc9",
        value: "21890",
        logIndex: "641",
      }),
    ];

    expect(isExcludedFundsTabTransaction(transfers[0])).toBe(true);
    expect(listCollateralMovementsFromTransfers({ transfers, proxyAddress: PROXY })).toEqual([]);
  });

  it("keeps proxy withdraw (0x6da267…) as withdraw", () => {
    const hash = "0x6da26770c2846cda69155a422b0cb6a8fa604bac58c297996dc39cc360c39938";
    const items = listCollateralMovementsFromTransfers({
      proxyAddress: PROXY,
      transfers: [
        transfer({
          hash,
          methodId: TX_METHOD_PROXY,
          functionName: "proxy(tuple[] _batches,bytes[] _signatures)",
          from: PROXY,
          to: "0xbfa9c7223a70000632a4fc2da642f35d10d0eb2b",
          value: "4000000",
          logIndex: "837",
        }),
      ],
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.movementType).toBe("withdraw");
    expect(items[0]?.amountUsd).toBe(4);
  });

  it("keeps handleOps deposit (0xecd1e3…) as deposit", () => {
    const hash = "0xecd1e3fb17390f2809692ae909ad070ede47a747c02a7cafe249b08ee99c6226";
    const items = listCollateralMovementsFromTransfers({
      proxyAddress: PROXY,
      transfers: [
        transfer({
          hash,
          methodId: TX_METHOD_HANDLE_OPS,
          functionName: "handleOps(tuple[] ops,address beneficiary)",
          from: "0x0000000000000000000000000000000000000000",
          to: PROXY,
          value: "3800000",
          logIndex: "682",
        }),
      ],
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.movementType).toBe("deposit");
    expect(items[0]?.amountUsd).toBe(3.8);
  });

  it("excludes matchOrders sell (0xc7a359…) even when exchange pays proxy", () => {
    const hash = "0xc7a359ce1668e70751736e5f9cbe067ac427de961bd0a18f1776380452596ffb";
    const items = listCollateralMovementsFromTransfers({
      proxyAddress: PROXY,
      transfers: [
        transfer({
          hash,
          methodId: TX_METHOD_MATCH_ORDERS,
          functionName: "matchOrders(bytes32,tuple,tuple[],uint256,uint256[],uint256,uint256[])",
          from: ADDRESSES.NEG_RISK_CTF_EXCHANGE_V2,
          to: PROXY,
          value: "940650",
          logIndex: "695",
        }),
      ],
    });

    expect(items).toEqual([]);
  });
});
