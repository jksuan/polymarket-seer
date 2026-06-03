"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import useSWR from "swr";
import { ethers } from "ethers";
import { AssetType, OrderType, Side } from "@polymarket/clob-client-v2";
import { useWallets } from "@privy-io/react-auth";
import { useTranslation } from "@/i18n";

import {
  POLYGON_CHAIN_ID,
  DATA_API_URL,
  ADDRESSES,
  CTF_ABI,
  NEG_RISK_ADAPTER_ABI,
  ZERO_PARENT_COLLECTION_ID,
} from "@/lib/constants";
import { createClobClient } from "@/lib/clobClientFactory";
import { isClobOrderSuccess, parseClobOrderError } from "@/lib/clobOrderResponse";
import { usePolymarketAuth } from "@/contexts/PolymarketAuthContext";
import { useGeoblock } from "@/contexts/GeoblockContext";
import { evaluateGeoblockForOrder } from "@/lib/geoblock/orderGate";
import { formatGeoblockOrderError } from "@/lib/geoblock/geoblockMessages";
import { formatTradingExecutionError } from "@/lib/geoblock/tradingErrors";
import { getCachedCreds, setCachedCreds } from "@/lib/utils";
import { selectPrimaryWallet } from "@/lib/primaryWallet";
import {
  ensureProxyCollateralSynced,
  formatCollateralBalanceFromAtomicUnits,
  getExchangeSpenderForMarket,
  getRequiredErc1155OperatorsForMarket,
  getRequiredPusdSpendersForMarket,
  readErc1155IsApprovedForAll,
  readProxyUsdcEAtomic,
  readProxyPusdAtomic,
  readPusdAllowanceAtomic,
  type ClobCollateralClient,
} from "@/auth/collateralBalance";
import { createDepositRelayExecutor } from "@/auth/depositRelayExecutor";
import {
  createTradingRelayClient,
  ensureDepositVaultDeployed,
  ensureDepositErc1155Approvals,
  ensureDepositTradingApprovals,
  executeDepositWalletRelayBatch,
  resolveTradingVault,
} from "@/auth/vault";

export type TxStep = "idle" | "preparing" | "deploying" | "approving" | "placing" | "success" | "error";

export function useTrading(
  walletAddress: string,
  proxyAddress: string | null,
  hasCreds: boolean,
  fetchBalance: () => void
) {
  const {
    authenticated,
    login,
    user,
    stickyExternalWalletClientType,
    primaryWalletSelectOptions,
    isEvmSignerReady,
  } = usePolymarketAuth();
  const { wallets } = useWallets();
  const { t, locale } = useTranslation();
  const { refreshBeforeOrder } = useGeoblock();

  // --- Transaction Progress Overlay States ---
  const [txStep, setTxStep] = useState<TxStep>("idle");
  const [txMessage, setTxMessage] = useState("");
  const [txOrderId, setTxOrderId] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const guardEvmSignerOrShowError = useCallback((): boolean => {
    if (isEvmSignerReady) return false;
    setTxStep("error");
    setTxMessage(t.header.evmSignerTradingBlock);
    setTxError(null);
    setTxOrderId(null);
    return true;
  }, [isEvmSignerReady, t.header.evmSignerTradingBlock]);

  const walletsRef = useRef(wallets);
  useEffect(() => {
    walletsRef.current = wallets;
  }, [wallets]);

  // --- 逻辑：获取资产组合数据 (SWR Fetcher) ---
  const fetcher = useCallback(async ([key, proxyAddr, walletAddr]: [string, string, string]) => {
    if (!proxyAddr || !walletAddr) return { positions: [], openOrders: [], trades: [] };

    // Check creds before pulling CLOB data
    const creds = getCachedCreds(walletAddr);
    if (!creds) return { positions: [], openOrders: [], trades: [] }; // If API keys aren't ready, we skip

    // Find the right wallet to sign with clob
    const currentWallets = walletsRef.current;
    const walletInfo = selectPrimaryWallet(currentWallets, walletAddr || user?.wallet?.address, primaryWalletSelectOptions);
    if (!walletInfo) return { positions: [], openOrders: [], trades: [] };

    const ethereumProvider = await walletInfo.getEthereumProvider();
    const provider = new ethers.providers.Web3Provider(ethereumProvider as any);
    const signer = provider.getSigner();

    // 同时发起两个 API 请求：持仓 + 活动记录
    const [posRes, activityRes] = await Promise.all([
      fetch(`${DATA_API_URL}/positions?user=${proxyAddr}`),
      fetch(`${DATA_API_URL}/activity?user=${proxyAddr}`)
    ]);

    // 解析持仓 — 按 endDate 降序排列
    let posArr: any[] = [];
    if (posRes.ok) {
      const posData = await posRes.json();
      posArr = Array.isArray(posData) ? posData : [];
      posArr.sort((a: any, b: any) => {
        const dateA = a.endDate ? new Date(a.endDate).getTime() : 0;
        const dateB = b.endDate ? new Date(b.endDate).getTime() : 0;
        return dateB - dateA;
      });
    }

    // 解析活动
    let actData: any[] = [];
    if (activityRes.ok) {
      const data = await activityRes.json();
      actData = Array.isArray(data) ? data : [];
    }

    // 3. 从 CLOB SDK 获取挂单
    const vault = await resolveTradingVault(signer, proxyAddr);
    const clob = createClobClient({
      signer: signer as never,
      creds,
      funderAddress: vault.address,
      signatureType: vault.signatureType,
    });
    const rawOrders = await clob.getOpenOrders().catch(() => []);
    const ordersArr: any[] = Array.isArray(rawOrders) ? rawOrders : [];

      // 4. 补充挂单的事件名称/图片等富信息
      if (ordersArr.length > 0) {
        // ── 第一层：从已获取的 posArr(持仓) 中提取已知市场信息 ──
        // 用两种 key 映射：asset(tokenId) 和 conditionId
        const infoByAssetId: Record<string, any> = {};
        const infoByCondId: Record<string, any> = {};
        if (posArr.length > 0) {
          posArr.forEach((p: any) => {
            const info = {
              question: p.title || p.question || p.marketName || '',
              icon: p.icon || '',
              endDate: p.endDate || '',
            };
            if (p.asset) infoByAssetId[p.asset] = info;
            if (p.conditionId) infoByCondId[p.conditionId] = info;
          });
        }

        // 找出持仓匹配不到的 conditionId，需要通过 CLOB API 二次查询
        const unmatchedCondIds = [...new Set(
          ordersArr
            .filter((o: any) => {
              const assetId = o.asset_id;
              const condId = o.market;
              return !infoByAssetId[assetId] && !infoByCondId[condId];
            })
            .map((o: any) => o.market)
            .filter(Boolean)
        )];

        // ── 第二层：用 CLOB getMarket(conditionId) 补充缺失的市场标题 ──
        const clobMarketInfo: Record<string, any> = {};
        if (unmatchedCondIds.length > 0) {
          await Promise.all(
            unmatchedCondIds.map(async (condId: string) => {
              try {
                const mkt = await clob.getMarket(condId);
                if (mkt && (mkt as any).question) {
                  clobMarketInfo[condId] = {
                    question: (mkt as any).question || '',
                    icon: (mkt as any).icon || '',
                    endDate: (mkt as any).end_date_iso || '',
                  };
                }
              } catch (e) {
                console.warn('CLOB getMarket failed for', condId, e);
              }
            })
          );
        }

        // ── 合并：富化每个订单 ──
        const enriched = ordersArr.map((order: any) => {
          // 优先级：持仓的 asset 匹配 > 持仓的 conditionId 匹配 > CLOB market 匹配
          const info =
            infoByAssetId[order.asset_id] ||
            infoByCondId[order.market] ||
            clobMarketInfo[order.market] ||
            {};
          return {
            ...order,
            title: (info as any).question || '',
            icon: (info as any).icon || '',
            marketEndDate: (info as any).endDate || '',
          };
        });

        // 按 created_at 降序排列（最新下单排最前）
        enriched.sort((a: any, b: any) => {
          const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tB - tA;
        });

        return { positions: posArr, trades: actData, openOrders: enriched };
      }

      return { positions: posArr, trades: actData, openOrders: [] };
  }, [user?.wallet?.address, primaryWalletSelectOptions]);

  // --- SWR 集成 ---
  const swrKey = (authenticated && proxyAddress && walletAddress && hasCreds)
    ? ["portfolio", proxyAddress, walletAddress]
    : null;

  const { data, mutate, isLoading, isValidating } = useSWR(
    swrKey,
    fetcher,
    {
      refreshInterval: 15000,
      revalidateOnFocus: true,
      dedupingInterval: 2000
    }
  );

  const positions = data?.positions || [];
  const openOrders = data?.openOrders || [];
  const trades = data?.trades || [];
  
  const isAuthInitializing = authenticated && swrKey === null && !data;
  const portfolioLoading = isLoading || isAuthInitializing;

  // Stablize fetchBalance reference to prevent infinite render loops in useEffect
  const fetchBalanceRef = useRef(fetchBalance);
  useEffect(() => {
    fetchBalanceRef.current = fetchBalance;
  }, [fetchBalance]);

  // --- Logic: Sync all portfolio data ---
  const syncData = useCallback(async (delay = 0) => {
    if (!proxyAddress || !walletAddress) return;
    
    // Optional delay to wait for Polymarket backend indexing
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    fetchBalanceRef.current();
    mutate();
  }, [proxyAddress, walletAddress, mutate]);

  // Auto-fetch portfolio wrapper for compatibility
  const fetchPortfolio = () => { mutate(); };

  // 保证余额能够自动拉取（持仓和记录由 SWR 自动处理）
  useEffect(() => {
    if (authenticated && proxyAddress && walletAddress && hasCreds) {
      fetchBalanceRef.current();
    }
  }, [authenticated, proxyAddress, walletAddress, hasCreds]);

  // --- 逻辑：执行兑换 (Redeem) / 归档 (Archive) ---
  // 自动检测 NegRisk（多结果互斥）市场并路由到正确的合约
  const handleRedeem = async (pos: any, mode: "redeem" | "archive" = "redeem") => {
    if (!pos || !proxyAddress) return;
    if (guardEvmSignerOrShowError()) return;

    setTxStep("preparing");
    setTxMessage(mode === "archive" ? t.tx.preparingArchive : t.tx.preparingRedeem);
    setTxError(null);

    try {
      const wallet = selectPrimaryWallet(wallets, walletAddress || user?.wallet?.address, primaryWalletSelectOptions);
      if (!wallet) throw new Error("未找到已连接钱包");
      const ethereumProvider = await wallet.getEthereumProvider();
      const provider = new ethers.providers.Web3Provider(ethereumProvider as any);
      const signer = provider.getSigner();
      const vault = await resolveTradingVault(signer, proxyAddress);

      // ── Step 1: 检测市场类型（NegRisk vs Standard） ──
      let isNegRisk = false;
      if (pos.asset) {
        try {
          const creds = getCachedCreds(walletAddress);
          if (creds) {
            const clobClient = createClobClient({
              signer: signer as never,
              creds,
              funderAddress: vault.address,
              signatureType: vault.signatureType,
            });
            isNegRisk = await clobClient.getNegRisk(pos.asset);
          }
        } catch (e) {
          console.warn("[Redeem] getNegRisk check failed, falling back to standard CTF:", e);
        }
      }
      console.log(`[Redeem] Market type: ${isNegRisk ? "NegRisk (多结果)" : "Standard (二元)"}, conditionId: ${pos.conditionId}, asset: ${pos.asset}`);

      const relayClient = createTradingRelayClient(signer);
      await ensureDepositVaultDeployed(relayClient, vault.address);
      let redeemTx: { to: string; data: string; value: string };

      if (isNegRisk) {
        // ▸ NegRisk 市场 → 调用 NegRiskAdapter.redeemPositions(conditionId, amounts)
        setTxMessage(mode === "archive"
          ? t.tx.checkingArchiveBalance
          : t.tx.checkingRedeemReward
        );

        // 查询链上 ERC1155 代币的实际余额
        const ctfContract = new ethers.Contract(
          ADDRESSES.CTF,
          ["function balanceOf(address account, uint256 id) view returns (uint256)"],
          provider
        );
        const tokenBalance = await ctfContract.balanceOf(vault.address, pos.asset);
        console.log(`[Redeem NegRisk] Token balance on-chain: ${tokenBalance.toString()}, outcomeIndex: ${pos.outcomeIndex}`);

        // 构造 amounts 数组：[outcome0_amount, outcome1_amount]
        // 用户只持有一个 outcome，另一个为 0
        const outcomeIdx = Number(pos.outcomeIndex || 0);
        const amounts = outcomeIdx === 0
          ? [tokenBalance, ethers.BigNumber.from(0)]
          : [ethers.BigNumber.from(0), tokenBalance];

        const negRiskInterface = new ethers.utils.Interface(NEG_RISK_ADAPTER_ABI);
        redeemTx = {
          to: ADDRESSES.NEG_RISK_ADAPTER,
          data: negRiskInterface.encodeFunctionData("redeemPositions", [pos.conditionId, amounts]),
          value: "0"
        };
      } else {
        // ▸ 标准二元市场 → 调用 CTF.redeemPositions(collateralToken, parentCollectionId, conditionId, [1, 2])
        const ctfInterface = new ethers.utils.Interface(CTF_ABI);
        const parentCollectionId = ZERO_PARENT_COLLECTION_ID;
        const indexSets = [1, 2];
        redeemTx = {
          to: ADDRESSES.CTF,
          data: ctfInterface.encodeFunctionData("redeemPositions", [ADDRESSES.USDCe, parentCollectionId, pos.conditionId, indexSets]),
          value: "0"
        };
      }

      // ── Step 4: 通过 Relayer 提交交易 ──
      setTxStep("placing");
      setTxMessage(mode === "archive"
        ? t.tx.activatingArchive
        : t.tx.activatingRedeem
      );

      await executeDepositWalletRelayBatch(
        relayClient,
        vault.address,
        [redeemTx],
        mode === "archive" ? "Archive Position" : "Redeem Positions"
      );

      setTxMessage(mode === "archive"
        ? t.tx.archiveBroadcasted
        : t.tx.redeemBroadcasted
      );

      setTxStep("success");
      setTxMessage(mode === "archive"
        ? t.tx.archiveSuccess
        : t.tx.redeemSuccess
      );
      
      // Auto-refresh positions after 1.5s to allow for indexing
      syncData(1500);
    } catch (err: any) {
      console.error(mode === "archive" ? "归档错误:" : "领奖错误:", err);
      const errMsg = err.message || String(err);
      
      if (errMsg.toLowerCase().includes("timeout")) {
        setTxStep("error");
        setTxMessage(t.tx.signatureTimeout);
        setTxError(t.tx.signatureTimeoutDesc);
        setTimeout(() => { window.location.reload(); }, 2000);
        return;
      }

      setTxStep("error");
      setTxError(errMsg);
      setTxMessage(mode === "archive" ? t.tx.archiveFailed : t.tx.redeemFailed);
    }
  };

  const handlePlaceRealBet = async (amount: string, customTokenId?: string, executionPrice?: number) => {
    if (!authenticated || !wallets || wallets.length === 0) { login(); return; }
    if (guardEvmSignerOrShowError()) return;

    const geoblockStatus = await refreshBeforeOrder();
    const gate = evaluateGeoblockForOrder(geoblockStatus);
    if (!gate.allowed) {
      const { title, description } = formatGeoblockOrderError(locale, gate);
      setTxStep("error");
      setTxMessage(title);
      setTxError(description);
      setTxOrderId(null);
      return;
    }

    setTxStep("preparing");
    setTxMessage(t.tx.switchingNetwork);
    setTxOrderId(null);
    setTxError(null);

    try {
      // --- Step 0: Wallet preparation ---
      const wallet = selectPrimaryWallet(wallets, walletAddress || user?.wallet?.address, primaryWalletSelectOptions);
      if (!wallet) throw new Error("未找到已连接钱包");

      try { await wallet.switchChain(POLYGON_CHAIN_ID); } catch (e) { console.warn("Switch chain skipped", e); }

      setTxMessage(t.tx.initTradingEnv);
      const ethereumProvider = await wallet.getEthereumProvider();
      const provider = new ethers.providers.Web3Provider(ethereumProvider as any);
      const signer = provider.getSigner();

      let creds = getCachedCreds(wallet.address);
      if (!creds) {
        setTxMessage(t.tx.generatingCreds);
        const clobClient = createClobClient({ signer: signer as never });
        try {
          creds = await clobClient.createOrDeriveApiKey();
        } catch (err) {
          console.warn("createOrDeriveApiKey failed:", err);
        }
        if (creds && creds.key) {
          setCachedCreds(wallet.address, creds);
        } else {
          const vault = await resolveTradingVault(signer, proxyAddress);
          const [usdcEAtomic, pusdAtomic] = await Promise.all([
            readProxyUsdcEAtomic(provider, vault.address),
            readProxyPusdAtomic(provider, vault.address),
          ]);
          const onchainBal = Number(
            formatCollateralBalanceFromAtomicUnits(usdcEAtomic + pusdAtomic)
          );
          if (onchainBal < Number(amount)) {
            throw new Error(`余额不足: 当前金库含 $${onchainBal.toFixed(2)}，但下注需要 $${Number(amount).toFixed(2)}`);
          }
          throw new Error("API 凭据初始化失败，请在 Polygon 链准备少量资产后重试");
        }
      }
      const vault = await resolveTradingVault(signer, proxyAddress);
      const clobClientWithCreds = createClobClient({
        signer: signer as never,
        creds,
        funderAddress: vault.address,
        signatureType: vault.signatureType,
      });
      const relayClient = createTradingRelayClient(signer);
      const relayExecutor = createDepositRelayExecutor(signer, vault.address);

      setTxMessage(customTokenId ? t.tx.linkedTargetMarket : t.tx.fetchingActiveMarket);
      const finalTokenId = customTokenId;
      if (!finalTokenId) throw new Error("未获取到有效的交易代币 ID，请从市场列表重新选择下注目标");

      const tickSizeEarly = await clobClientWithCreds.getTickSize(finalTokenId).catch(() => "0.01") as "0.1" | "0.01" | "0.001" | "0.0001";
      const negRiskEarly = await clobClientWithCreds.getNegRisk(finalTokenId).catch(() => false);
      const requiredSpender = getExchangeSpenderForMarket(negRiskEarly);
      const requiredSpenders = getRequiredPusdSpendersForMarket(negRiskEarly);

      // --- Step 1: Deploy Deposit Wallet ---
      setTxStep("deploying");
      setTxMessage(t.tx.checkingVaultState);

      try {
        const wasDeployed = await ensureDepositVaultDeployed(relayClient, vault.address);
        if (!wasDeployed) {
          setTxMessage(t.tx.vaultNotActivated);
          setTxMessage(t.tx.deployTxSubmitted);
        } else {
          setTxMessage(t.tx.vaultActivated);
        }
      } catch (deployErr: unknown) {
        const deployMsg = deployErr instanceof Error ? deployErr.message : String(deployErr);
        if (!deployMsg.includes("deployed")) {
          console.error("Deploy error:", deployErr);
        }
      }

      // --- Step 2: Batch Token Approvals（分块 + 链上校验）---
      setTxStep("approving");
      setTxMessage(t.tx.settingApproval);

      await ensureDepositTradingApprovals(relayClient, vault.address, provider, requiredSpenders);
      await ensureDepositErc1155Approvals(
        relayClient,
        vault.address,
        provider,
        getRequiredErc1155OperatorsForMarket(negRiskEarly)
      );
      setTxMessage(t.tx.approveSuccess);

      const marketAllowance = await readPusdAllowanceAtomic(provider, vault.address, requiredSpender);
      if (marketAllowance === BigInt(0)) {
        throw new Error(
          `pUSD 仍未授权给 ${negRiskEarly ? "Neg Risk Adapter" : "Exchange V2"}，请重试并完成签名。`
        );
      }

      try {
        await clobClientWithCreds.updateBalanceAllowance({ asset_type: AssetType.COLLATERAL });
      } catch (e) { console.warn("updateBalanceAllowance non-critical", e); }

      // --- Step 3: Balance sync（部署+授权后再读 CLOB 可交易余额）---
      setTxStep("preparing");
      setTxMessage(t.tx.checkingBalance);
      const { balanceAtomic } = await ensureProxyCollateralSynced({
        clobClient: clobClientWithCreds as ClobCollateralClient,
        provider,
        proxyAddress: vault.address,
        relayExecutor,
      });
      const currentBalance = Number(formatCollateralBalanceFromAtomicUnits(balanceAtomic));
      const targetAmount = Number(amount);
      if (currentBalance < targetAmount) {
        const [usdcEAtomic, pusdAtomic] = await Promise.all([
          readProxyUsdcEAtomic(provider, vault.address),
          readProxyPusdAtomic(provider, vault.address),
        ]);
        const onChainHint = Number(
          formatCollateralBalanceFromAtomicUnits(usdcEAtomic + pusdAtomic)
        );
        if (onChainHint >= targetAmount) {
          throw new Error(
            `余额同步中: 金库链上约 $${onChainHint.toFixed(2)}，CLOB 可交易 $${currentBalance.toFixed(2)}。Bridge 到账后请等待 1–2 分钟再试。`
          );
        }
        throw new Error(
          `余额不足: 当前可交易余额 $${currentBalance.toFixed(2)}，但下注需要 $${targetAmount.toFixed(2)}`
        );
      }

      // --- Step 4: Place Market Order ---
      setTxStep("placing");
      setTxMessage(t.tx.submittingBuyOrder);
      const parsedAmount = Number(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) throw new Error("下注金额无效");

      const tickSize = tickSizeEarly;
      const negRisk = negRiskEarly;

      // Apply 3% implicit slippage (increases FOK fill rate for large or low-liquidity orders)
      const limitPrice = executionPrice 
          ? Math.min(Number((executionPrice + 0.03).toFixed(3)), 1.0) 
          : undefined;

      const resp = await clobClientWithCreds.createAndPostMarketOrder({
        tokenID: finalTokenId, 
        amount: parsedAmount, 
        side: Side.BUY,
        price: limitPrice,
        orderType: OrderType.FOK,
      }, { tickSize, negRisk });

      if (isClobOrderSuccess(resp)) {
        setTxStep("success");
        setTxMessage(t.tx.placeSuccess);
        setTxOrderId(resp.orderID || null);
        syncData(1500);
      } else {
        throw new Error(parseClobOrderError(resp));
      }

    } catch (err: any) {
      console.error("Place bet error:", err);
      let finalMsg = err.message || String(err);

      if (finalMsg.toLowerCase().includes("timeout")) {
        setTxStep("error");
        setTxMessage(t.tx.signatureTimeout);
        setTxError(t.tx.signatureTimeoutDesc);
        setTimeout(() => { window.location.reload(); }, 2000);
        return;
      }

      setTxStep("error");
      if (finalMsg.toLowerCase().includes("deadline too soon")) {
        finalMsg = "授权签名有效期不足，请重新下注并在弹窗出现后尽快完成全部签名。";
      }
      if (finalMsg.toLowerCase().includes("allowance")) {
        finalMsg = "交易授权不足：Neg Risk 市场需授权 Neg Risk Adapter，请重试并完成全部签名。";
      }
      if (finalMsg.includes("not enough balance")) {
        finalMsg = "余额不足或授权尚未生效，请确认金库中有足够的可交易余额。";
      }
      if (finalMsg.includes("user rejected")) finalMsg = "用户取消了签名请求。";

      if (finalMsg.includes("余额不足") || finalMsg.includes("not enough balance")) {
        setTxMessage(t.tx.insufficientBalance);
      } else {
        setTxMessage(t.tx.tradeError);
      }

      setTxError(finalMsg);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!authenticated || !wallets || wallets.length === 0 || !proxyAddress) return;
    if (guardEvmSignerOrShowError()) return;

    setTxStep("preparing");
    setTxMessage("正在向撮合引擎发送取消请求...");
    setTxError(null);

    try {
      const wallet = selectPrimaryWallet(wallets, walletAddress || user?.wallet?.address, primaryWalletSelectOptions);
      if (!wallet) throw new Error("未找到已连接钱包");
        
      const ethereumProvider = await wallet.getEthereumProvider();
      const provider = new ethers.providers.Web3Provider(ethereumProvider as any);
      const signer = provider.getSigner();

      const creds = getCachedCreds(wallet.address);
      if (!creds) throw new Error("API凭证已过期或不存在，请重新连接");

      const vault = await resolveTradingVault(signer, proxyAddress);
      const clobClient = createClobClient({
        signer: signer as never,
        creds,
        funderAddress: vault.address,
        signatureType: vault.signatureType,
      });

      setTxStep("placing");
      setTxMessage(t.tx.cancelingOrder);

      const resp = await clobClient.cancelOrder({ orderID: orderId });

      if (resp && resp.canceled && resp.canceled.includes(orderId)) {
        setTxStep("success");
        setTxMessage(t.tx.cancelSuccess);
        syncData(1000); // Cancellation usually indexes faster
      } else {
        throw new Error("取消失败，订单可能已成交或已被处理");
      }
    } catch (err: any) {
      console.error("Cancel order error:", err);
      const errMsg = err.message || String(err);

      if (errMsg.toLowerCase().includes("timeout")) {
        setTxStep("error");
        setTxMessage(t.tx.signatureTimeout);
        setTxError(t.tx.signatureTimeoutDesc);
        setTimeout(() => { window.location.reload(); }, 2000);
        return;
      }

      setTxStep("error");
      setTxError(errMsg);
      setTxMessage(t.tx.cancelFailed);
    }
  };

  const handleSellPosition = async (tokenId: string, sharesToSell: string, executionPrice?: number) => {
    if (!authenticated || !wallets || wallets.length === 0 || !proxyAddress) return;
    if (guardEvmSignerOrShowError()) return;

    const geoblockForClose = await refreshBeforeOrder();
    const closeGate = evaluateGeoblockForOrder(geoblockForClose);
    if (!closeGate.allowed) {
      const { title, description } = formatGeoblockOrderError(locale, closeGate);
      setTxStep("error");
      setTxMessage(title);
      setTxError(description);
      setTxOrderId(null);
      return;
    }

    setTxStep("preparing");
    setTxMessage(t.tx.preparingSell);
    setTxError(null);

    try {
      const wallet = selectPrimaryWallet(wallets, walletAddress || user?.wallet?.address, primaryWalletSelectOptions);
      if (!wallet) throw new Error("未找到已连接钱包");

      try { await wallet.switchChain(POLYGON_CHAIN_ID); } catch (e) { console.warn("Switch chain skipped", e); }

      const ethereumProvider = await wallet.getEthereumProvider();
      const provider = new ethers.providers.Web3Provider(ethereumProvider as any);
      const signer = provider.getSigner();

      const creds = getCachedCreds(wallet.address);
      if (!creds) throw new Error("API凭证过期，请重启");

      const vault = await resolveTradingVault(signer, proxyAddress);
      const clobClient = createClobClient({
        signer: signer as never,
        creds,
        funderAddress: vault.address,
        signatureType: vault.signatureType,
      });

      const parsedShares = Number(sharesToSell);
      if (!parsedShares || parsedShares <= 0) {
          throw new Error("无效的出售份额");
      }

      const tickSize = await clobClient.getTickSize(tokenId).catch(() => "0.01") as "0.1" | "0.01" | "0.001" | "0.0001";
      const negRisk = await clobClient.getNegRisk(tokenId).catch(() => false);
      const requiredErc1155Operators = getRequiredErc1155OperatorsForMarket(negRisk);
      const relayClient = createTradingRelayClient(signer);

      setTxStep("approving");
      setTxMessage(t.tx.settingApproval);
      await ensureDepositVaultDeployed(relayClient, vault.address);
      await ensureDepositErc1155Approvals(
        relayClient,
        vault.address,
        provider,
        requiredErc1155Operators
      );

      for (const operator of requiredErc1155Operators) {
        const approved = await readErc1155IsApprovedForAll(provider, vault.address, operator);
        if (!approved) {
          throw new Error(
            `Outcome 代币仍未授权给 ${negRisk ? "Neg Risk Exchange V2" : "Exchange V2"}，请重试并完成签名。`
          );
        }
      }

      try {
        await clobClient.updateBalanceAllowance({
          asset_type: AssetType.CONDITIONAL,
          token_id: tokenId,
        });
      } catch (e) {
        console.warn("updateBalanceAllowance conditional non-critical", e);
      }

      setTxStep("placing");
      setTxMessage(t.tx.submittingSellOrder);

      // Apply 3% implicit slippage for SELL (we accept slightly lower sell price)
      const limitPrice = executionPrice 
          ? Math.max(Number((executionPrice - 0.03).toFixed(3)), 0.001) 
          : undefined;

      const resp = await clobClient.createAndPostMarketOrder({
        tokenID: tokenId,
        amount: parsedShares,
        side: Side.SELL,
        price: limitPrice,
        orderType: OrderType.FOK,
      }, { tickSize, negRisk });

      if (isClobOrderSuccess(resp)) {
        setTxStep("success");
        setTxMessage(t.tx.sellSuccess);
        setTxOrderId(resp.orderID || null);
        syncData(1500);
      } else {
        throw new Error(parseClobOrderError(resp));
      }
    } catch (err: any) {
      console.error("Sell position error:", err);
      let finalMsg = formatTradingExecutionError(err, locale, geoblockForClose.blocked);

      if (finalMsg.toLowerCase().includes("timeout")) {
        setTxStep("error");
        setTxMessage(t.tx.signatureTimeout);
        setTxError(t.tx.signatureTimeoutDesc);
        setTimeout(() => { window.location.reload(); }, 2000);
        return;
      }

      setTxStep("error");
      if (!geoblockForClose.blocked && finalMsg.toLowerCase().includes("deadline too soon")) {
        finalMsg = "授权签名有效期不足，请重新卖出并在弹窗出现后尽快完成全部签名。";
      }
      if (!geoblockForClose.blocked && finalMsg.toLowerCase().includes("allowance")) {
        finalMsg = "Outcome 代币授权不足：Neg Risk 市场需授权 Neg Risk Exchange V2，请重试并完成全部签名。";
      }
      if (!geoblockForClose.blocked && finalMsg.includes("user rejected")) finalMsg = "用户取消了签名请求。";
      
      setTxError(finalMsg);
      setTxMessage(geoblockForClose.blocked ? formatGeoblockOrderError(locale, { allowed: false, reason: "blocked" }).title : t.tx.sellFailed);
    }
  };

  const handleLimitSellPosition = async (tokenId: string, sharesToSell: string, limitPrice: number) => {
    if (!authenticated || !wallets || wallets.length === 0 || !proxyAddress) return;
    if (guardEvmSignerOrShowError()) return;

    const geoblockForClose = await refreshBeforeOrder();
    const closeGate = evaluateGeoblockForOrder(geoblockForClose);
    if (!closeGate.allowed) {
      const { title, description } = formatGeoblockOrderError(locale, closeGate);
      setTxStep("error");
      setTxMessage(title);
      setTxError(description);
      setTxOrderId(null);
      return;
    }

    setTxStep("preparing");
    setTxMessage(t.tx.preparingLimitOrder);
    setTxError(null);

    try {
      const wallet = selectPrimaryWallet(wallets, walletAddress || user?.wallet?.address, primaryWalletSelectOptions);
      if (!wallet) throw new Error("未找到已连接钱包");

      try { await wallet.switchChain(POLYGON_CHAIN_ID); } catch (e) { console.warn("Switch chain skipped", e); }

      const ethereumProvider = await wallet.getEthereumProvider();
      const provider = new ethers.providers.Web3Provider(ethereumProvider as any);
      const signer = provider.getSigner();

      const creds = getCachedCreds(wallet.address);
      if (!creds) throw new Error("API凭证过期，请重启");

      const vault = await resolveTradingVault(signer, proxyAddress);
      const clobClient = createClobClient({
        signer: signer as never,
        creds,
        funderAddress: vault.address,
        signatureType: vault.signatureType,
      });

      const parsedShares = Number(sharesToSell);
      if (!parsedShares || parsedShares <= 0 || !limitPrice || limitPrice <= 0) {
          throw new Error("无效的出售份额或价格");
      }

      const tickSize = await clobClient.getTickSize(tokenId).catch(() => "0.01") as "0.1" | "0.01" | "0.001" | "0.0001";
      const negRisk = await clobClient.getNegRisk(tokenId).catch(() => false);
      const requiredErc1155Operators = getRequiredErc1155OperatorsForMarket(negRisk);
      const relayClient = createTradingRelayClient(signer);

      setTxStep("approving");
      setTxMessage(t.tx.settingApproval);
      await ensureDepositVaultDeployed(relayClient, vault.address);
      await ensureDepositErc1155Approvals(
        relayClient,
        vault.address,
        provider,
        requiredErc1155Operators
      );

      for (const operator of requiredErc1155Operators) {
        const approved = await readErc1155IsApprovedForAll(provider, vault.address, operator);
        if (!approved) {
          throw new Error(
            `Outcome 代币仍未授权给 ${negRisk ? "Neg Risk Exchange V2" : "Exchange V2"}，请重试并完成签名。`
          );
        }
      }

      try {
        await clobClient.updateBalanceAllowance({
          asset_type: AssetType.CONDITIONAL,
          token_id: tokenId,
        });
      } catch (e) {
        console.warn("updateBalanceAllowance conditional non-critical", e);
      }

      setTxStep("placing");
      setTxMessage(t.tx.submittingLimitOrder);

      const resp = await clobClient.createAndPostOrder({
        tokenID: tokenId,
        size: parsedShares,
        price: limitPrice,
        side: Side.SELL,
      }, { tickSize, negRisk });

      if (isClobOrderSuccess(resp)) {
        setTxStep("success");
        setTxMessage(t.tx.limitOrderSuccess);
        setTxOrderId(resp.orderID || null);
        syncData(1500);
      } else {
        throw new Error(parseClobOrderError(resp));
      }
    } catch (err: any) {
      console.error("Limit sell error:", err);
      let finalMsg = formatTradingExecutionError(err, locale, geoblockForClose.blocked);

      if (finalMsg.toLowerCase().includes("timeout")) {
        setTxStep("error");
        setTxMessage(t.tx.signatureTimeout);
        setTxError(t.tx.signatureTimeoutDesc);
        setTimeout(() => { window.location.reload(); }, 2000);
        return;
      }

      setTxStep("error");
      if (!geoblockForClose.blocked && finalMsg.toLowerCase().includes("deadline too soon")) {
        finalMsg = "授权签名有效期不足，请重新挂单并在弹窗出现后尽快完成全部签名。";
      }
      if (!geoblockForClose.blocked && finalMsg.toLowerCase().includes("allowance")) {
        finalMsg = "Outcome 代币授权不足：Neg Risk 市场需授权 Neg Risk Exchange V2，请重试并完成全部签名。";
      }
      if (!geoblockForClose.blocked && finalMsg.includes("user rejected")) finalMsg = "用户取消了签名请求。";
      
      setTxError(finalMsg);
      setTxMessage(geoblockForClose.blocked ? formatGeoblockOrderError(locale, { allowed: false, reason: "blocked" }).title : t.tx.limitSellFailed);
    }
  };

  const closeTxOverlay = () => {
    setTxStep("idle");
    setTxMessage("");
    setTxOrderId(null);
    setTxError(null);
    if (proxyAddress) {
      fetchBalance();
      mutate();
    }
  };

  return {
    txStep, setTxStep,
    txMessage, setTxMessage,
    txOrderId, setTxOrderId,
    txError, setTxError,
    positions,
    openOrders,
    trades,
    portfolioLoading,
    fetchPortfolio,
    handleRedeem,
    handlePlaceRealBet,
    handleCancelOrder,
    handleSellPosition,
    handleLimitSellPosition,
    closeTxOverlay
  };
}
