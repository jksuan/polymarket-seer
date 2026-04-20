"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import useSWR from "swr";
import { ethers } from "ethers";
import { ClobClient } from "@polymarket/clob-client";
import { RelayClient, RelayerTxType } from "@polymarket/builder-relayer-client";
import { BuilderConfig } from "@polymarket/builder-relayer-client/node_modules/@polymarket/builder-signing-sdk";
import { deriveSafe } from "@polymarket/builder-relayer-client/dist/builder/derive";
import { usePrivy, useWallets } from "@privy-io/react-auth";

import {
  POLYGON_CHAIN_ID,
  CLOB_API_URL,
  SAFE_FACTORY_POLYGON,
  DATA_API_URL,
  RELAYER_URL,
  ADDRESSES,
  USDC_DECIMALS,
  ERC20_ABI,
  ERC1155_ABI,
  CTF_ABI,
  NEG_RISK_ADAPTER_ABI,
  SIGNATURE_TYPE_GNOSIS_SAFE,
  ZERO_PARENT_COLLECTION_ID,
} from "@/lib/constants";
import { getCachedCreds, setCachedCreds } from "@/lib/utils";

export type TxStep = "idle" | "preparing" | "deploying" | "approving" | "placing" | "success" | "error";

export function useTrading(
  walletAddress: string,
  proxyAddress: string | null,
  hasCreds: boolean,
  fetchBalance: () => void
) {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  // --- Transaction Progress Overlay States ---
  const [txStep, setTxStep] = useState<TxStep>("idle");
  const [txMessage, setTxMessage] = useState("");
  const [txOrderId, setTxOrderId] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

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
    const walletInfo = currentWallets.find(w => w.address.toLowerCase() === walletAddr?.toLowerCase())
      || currentWallets.find(w => w.walletClientType === "privy")
      || currentWallets[0];
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
    const clob = new ClobClient(CLOB_API_URL, POLYGON_CHAIN_ID, signer, creds, SIGNATURE_TYPE_GNOSIS_SAFE, proxyAddr);
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
  }, []);

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

    setTxStep("preparing");
    setTxMessage(mode === "archive" ? "正在准备归档交易..." : "正在构造领奖交易请求...");
    setTxError(null);

    try {
      const wallet = wallets.find(w => w.address.toLowerCase() === walletAddress?.toLowerCase()) || wallets[0];
      const ethereumProvider = await wallet.getEthereumProvider();
      const provider = new ethers.providers.Web3Provider(ethereumProvider as any);
      const signer = provider.getSigner();

      // ── Step 1: 检测市场类型（NegRisk vs Standard） ──
      let isNegRisk = false;
      if (pos.asset) {
        try {
          const creds = getCachedCreds(walletAddress);
          if (creds) {
            const clobClient = new ClobClient(CLOB_API_URL, POLYGON_CHAIN_ID, signer as any, creds, SIGNATURE_TYPE_GNOSIS_SAFE, proxyAddress);
            isNegRisk = await clobClient.getNegRisk(pos.asset);
          }
        } catch (e) {
          console.warn("[Redeem] getNegRisk check failed, falling back to standard CTF:", e);
        }
      }
      console.log(`[Redeem] Market type: ${isNegRisk ? "NegRisk (多结果)" : "Standard (二元)"}, conditionId: ${pos.conditionId}, asset: ${pos.asset}`);

      // ── Step 2: 构造 Relayer 客户端 ──
      const builderConfig = new BuilderConfig({ remoteBuilderConfig: { url: `${window.location.origin}/api/sign` } });
      const relayClient = new RelayClient(RELAYER_URL, POLYGON_CHAIN_ID, signer as any, builderConfig, RelayerTxType.SAFE);

      // ── Step 3: 根据市场类型，构造不同的合约调用 ──
      let redeemTx: { to: string; data: string; value: string };

      if (isNegRisk) {
        // ▸ NegRisk 市场 → 调用 NegRiskAdapter.redeemPositions(conditionId, amounts)
        setTxMessage(mode === "archive"
          ? "检测到多结果市场，正在查询链上代币余额..."
          : "检测到多结果市场，正在查询可领取奖励..."
        );

        // 查询链上 ERC1155 代币的实际余额
        const ctfContract = new ethers.Contract(
          ADDRESSES.CTF,
          ["function balanceOf(address account, uint256 id) view returns (uint256)"],
          provider
        );
        const tokenBalance = await ctfContract.balanceOf(proxyAddress, pos.asset);
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
        ? "正在通过 Relayer 激活归档交易..."
        : "正在通过 Relayer 激活资产并提取奖励..."
      );

      const tx = await relayClient.execute([redeemTx], mode === "archive" ? "Archive Position" : "Redeem Positions");

      setTxMessage(mode === "archive"
        ? "归档交易已广播，等待链上确认..."
        : "领奖交易已广播，等待区块链状态更新..."
      );
      await tx.wait();

      setTxStep("success");
      setTxMessage(mode === "archive"
        ? "持仓已归档，链上代币已清理完成。"
        : "恭喜！奖励已成功领取，资金已划转至您的金库。"
      );
      
      // Auto-refresh positions after 1.5s to allow for indexing
      syncData(1500);
    } catch (err: any) {
      console.error(mode === "archive" ? "归档错误:" : "领奖错误:", err);
      const errMsg = err.message || String(err);
      
      if (errMsg.toLowerCase().includes("timeout")) {
        setTxStep("error");
        setTxMessage("⚠️ 签名通道休眠，交易未发送，资产安全。即将为您重新激活页面...");
        setTxError("签名通道因长时间休眠已断开。页面将自动刷新以恢复连接，届时您可重新操作。");
        setTimeout(() => { window.location.reload(); }, 2000);
        return;
      }

      setTxStep("error");
      setTxError(errMsg);
      setTxMessage(mode === "archive" ? "归档请求执行失败" : "领奖请求执行失败");
    }
  };

  const handlePlaceRealBet = async (amount: string, customTokenId?: string, executionPrice?: number) => {
    if (!authenticated || !wallets || wallets.length === 0) { login(); return; }

    setTxStep("preparing");
    setTxMessage("正在切换至 Polygon 网络...");
    setTxOrderId(null);
    setTxError(null);

    try {
      // --- Step 0: Wallet preparation ---
      let wallet = wallets.find(w => w.address.toLowerCase() === walletAddress?.toLowerCase())
        || wallets.find(w => w.walletClientType === 'privy')
        || wallets[0];
      if (!wallet) throw new Error("未找到已连接钱包");

      try { await wallet.switchChain(POLYGON_CHAIN_ID); } catch (e) { console.warn("Switch chain skipped", e); }

      setTxMessage("正在初始化交易环境...");
      const ethereumProvider = await wallet.getEthereumProvider();
      const provider = new ethers.providers.Web3Provider(ethereumProvider as any);
      const signer = provider.getSigner();

      let creds = getCachedCreds(wallet.address);
      if (!creds) {
        setTxMessage("初次交易，正在自动为您生成交易凭据...");
        const clobClient = new ClobClient(CLOB_API_URL, POLYGON_CHAIN_ID, signer as any);
        try {
          creds = await clobClient.deriveApiKey();
        } catch (e) {
          try {
            creds = await clobClient.createApiKey();
          } catch (err) {
            console.warn("createApiKey failed:", err);
          }
        }
        if (creds && creds.key) {
          setCachedCreds(wallet.address, creds);
        } else {
          // 如果生成失败，可能是因为没激活且余额为 0（Polymarket 拒绝未入金的新地址）。
          // 在此拦截，假装是余额不足，从而让页面弹起充值引导层。
          const derivedProxy = proxyAddress || deriveSafe(wallet.address, SAFE_FACTORY_POLYGON);
          const contract = new ethers.Contract(ADDRESSES.USDCe, ERC20_ABI, provider);
          const onchainBalWei = await contract.balanceOf(derivedProxy);
          const onchainBal = Number(ethers.utils.formatUnits(onchainBalWei, USDC_DECIMALS));
          if (onchainBal < Number(amount)) {
            throw new Error(`余额不足: 当前金库含 $${onchainBal.toFixed(2)} USDC.e，但下注需要 $${Number(amount).toFixed(2)} USDC.e`);
          }
          throw new Error("API 凭据初始化失败，请在 Polygon 链准备少量资产后重试");
        }
      }
      const derivedProxy = proxyAddress || deriveSafe(wallet.address, SAFE_FACTORY_POLYGON);

      // --- Step 1: Pre-flight Check (Balance) ---
      setTxMessage("正在检查金库余额...");
      const clobClientWithCreds = new ClobClient(CLOB_API_URL, POLYGON_CHAIN_ID, signer as any, creds, SIGNATURE_TYPE_GNOSIS_SAFE, derivedProxy as string);
      try {
        const balanceData = await clobClientWithCreds.getBalanceAllowance({ asset_type: "COLLATERAL" as any });
        const currentBalance = balanceData?.balance ? Number(ethers.utils.formatUnits(balanceData.balance, USDC_DECIMALS)) : 0;
        const targetAmount = Number(amount);
        if (currentBalance < targetAmount) {
          throw new Error(`余额不足: 当前金库含 $${currentBalance.toFixed(2)} USDC.e，但下注需要 $${targetAmount.toFixed(2)} USDC.e`);
        }
      } catch (balErr: any) {
        if (balErr.message && balErr.message.includes("余额不足")) {
          throw balErr;
        } else {
          console.warn("余额查询失败，如果确认有钱请忽略", balErr);
          try {
            const contract = new ethers.Contract(ADDRESSES.USDCe, ERC20_ABI, provider);
            const onchainBalWei = await contract.balanceOf(derivedProxy);
            const onchainBal = Number(ethers.utils.formatUnits(onchainBalWei, USDC_DECIMALS));
            if (onchainBal < Number(amount)) {
              throw new Error(`余额不足: 金库可用资金不足以支付此次下注`);
            }
          } catch (fallbackBalErr: any) {
            if (fallbackBalErr.message && fallbackBalErr.message.includes("余额不足")) {
              throw fallbackBalErr;
            }
          }
        }
      }

      setTxMessage(customTokenId ? "已关联目标市场..." : "正在获取活跃市场数据...");
      let finalTokenId = customTokenId;
      if (!finalTokenId) throw new Error("未获取到有效的交易代币 ID，请从市场列表重新选择下注目标");

      // --- Step 2: Deploy Safe Wallet ---
      setTxStep("deploying");
      setTxMessage("正在检查金库部署状态...");
      const builderConfig = new BuilderConfig({ remoteBuilderConfig: { url: `${window.location.origin}/api/sign` } });
      const relayClient = new RelayClient(RELAYER_URL, POLYGON_CHAIN_ID, signer as any, builderConfig, RelayerTxType.SAFE);

      try {
        const isDeployed = await relayClient.getDeployed(derivedProxy as string);
        if (!isDeployed) {
          setTxMessage("金库尚未激活，正在通过 Relayer 免费部署...");
          const d = await relayClient.deploy();
          setTxMessage("部署交易已提交，等待链上确认...");
          await d.wait();
        } else {
          setTxMessage("金库已激活 ✓");
        }
      } catch (deployErr: any) {
        if (!String(deployErr.message || deployErr).includes("deployed")) {
          console.error("Deploy error:", deployErr);
        }
      }

      // --- Step 2: Batch Token Approvals ---
      setTxStep("approving");
      setTxMessage("正在设置代币交易授权 (一次性操作)...");
      const erc20 = new ethers.utils.Interface(ERC20_ABI);
      const erc1155 = new ethers.utils.Interface(ERC1155_ABI);
      const MAX = ethers.constants.MaxUint256;

      try {
        await relayClient.execute([
          { to: ADDRESSES.USDCe, data: erc20.encodeFunctionData("approve", [ADDRESSES.CTF, MAX]), value: "0" },
          { to: ADDRESSES.USDCe, data: erc20.encodeFunctionData("approve", [ADDRESSES.CTF_EXCHANGE, MAX]), value: "0" },
          { to: ADDRESSES.USDCe, data: erc20.encodeFunctionData("approve", [ADDRESSES.NEG_RISK_CTF_EXCHANGE, MAX]), value: "0" },
          { to: ADDRESSES.CTF, data: erc1155.encodeFunctionData("setApprovalForAll", [ADDRESSES.CTF_EXCHANGE, true]), value: "0" }
        ], "Batch Approve");
        setTxMessage("授权完成 ✓，正在同步余额...");
      } catch (approveErr: any) {
        console.warn("Approval may have already been set:", approveErr);
        setTxMessage("授权已存在，跳过 ✓");
      }

      try {
        await clobClientWithCreds.updateBalanceAllowance({ asset_type: "COLLATERAL" as any });
      } catch (e) { console.warn("updateBalanceAllowance non-critical", e); }

      // --- Step 3: Place Market Order ---
      setTxStep("placing");
      setTxMessage("正在向 Polymarket 提交限制吃单保护(FOK)...");
      const parsedAmount = Number(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) throw new Error("下注金额无效");

      // Apply 3% implicit slippage (increases FOK fill rate for large or low-liquidity orders)
      const limitPrice = executionPrice 
          ? Math.min(Number((executionPrice + 0.03).toFixed(3)), 1.0) 
          : undefined;

      const resp = await clobClientWithCreds.createAndPostMarketOrder({
        tokenID: finalTokenId, 
        amount: parsedAmount, 
        side: "BUY" as any,
        price: limitPrice,
        orderType: "FOK" as any
      });

      if (resp && resp.success) {
        setTxStep("success");
        setTxMessage("下注成功！订单已被 Polymarket 撮合引擎接受。");
        setTxOrderId(resp.orderID || null);
        syncData(1500);
      } else {
        let errorMsg = resp?.error || JSON.stringify(resp);
        try {
          const parsed = JSON.parse(errorMsg);
          if (parsed?.data?.error) {
            errorMsg = parsed.data.error;
          }
        } catch (e) { }

        throw new Error(errorMsg);
      }

    } catch (err: any) {
      console.error("Place bet error:", err);
      let finalMsg = err.message || String(err);

      if (finalMsg.toLowerCase().includes("timeout")) {
        setTxStep("error");
        setTxMessage("⚠️ 签名通道休眠，交易未发送，资产安全。即将为您重新激活页面...");
        setTxError("签名通道因长时间休眠已断开。页面将自动刷新以恢复连接，届时您可重新操作。");
        setTimeout(() => { window.location.reload(); }, 2000);
        return;
      }

      setTxStep("error");
      if (finalMsg.includes("not enough balance")) finalMsg = "余额不足或授权尚未生效，请确认金库中有足够的 USDC.e。";
      if (finalMsg.includes("user rejected")) finalMsg = "用户取消了签名请求。";

      if (finalMsg.includes("余额不足") || finalMsg.includes("not enough balance")) {
        setTxMessage("账户余额不足，请充值后重试");
      } else {
        setTxMessage("交易出错或被中断");
      }

      setTxError(finalMsg);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!authenticated || !wallets || wallets.length === 0 || !proxyAddress) return;

    setTxStep("preparing");
    setTxMessage("正在向撮合引擎发送取消请求...");
    setTxError(null);

    try {
      const wallet = wallets.find(w => w.address.toLowerCase() === walletAddress?.toLowerCase())
        || wallets.find(w => w.walletClientType === "privy")
        || wallets[0];
        
      const ethereumProvider = await wallet.getEthereumProvider();
      const provider = new ethers.providers.Web3Provider(ethereumProvider as any);
      const signer = provider.getSigner();

      const creds = getCachedCreds(wallet.address);
      if (!creds) throw new Error("API凭证已过期或不存在，请重新连接");

      const clobClient = new ClobClient(CLOB_API_URL, POLYGON_CHAIN_ID, signer as any, creds, SIGNATURE_TYPE_GNOSIS_SAFE, proxyAddress);

      setTxStep("placing");
      setTxMessage("正在取消订单...");

      const resp = await clobClient.cancelOrder({ orderID: orderId });

      if (resp && resp.canceled && resp.canceled.includes(orderId)) {
        setTxStep("success");
        setTxMessage("订单已成功取消");
        syncData(1000); // Cancellation usually indexes faster
      } else {
        throw new Error("取消失败，订单可能已成交或已被处理");
      }
    } catch (err: any) {
      console.error("Cancel order error:", err);
      const errMsg = err.message || String(err);

      if (errMsg.toLowerCase().includes("timeout")) {
        setTxStep("error");
        setTxMessage("⚠️ 签名通道休眠，交易未发送，资产安全。即将为您重新激活页面...");
        setTxError("签名通道因长时间休眠已断开。页面将自动刷新以恢复连接，届时您可重新操作。");
        setTimeout(() => { window.location.reload(); }, 2000);
        return;
      }

      setTxStep("error");
      setTxError(errMsg);
      setTxMessage("取消请求执行失败");
    }
  };

  const handleSellPosition = async (tokenId: string, sharesToSell: string, executionPrice?: number) => {
    if (!authenticated || !wallets || wallets.length === 0 || !proxyAddress) return;

    setTxStep("preparing");
    setTxMessage("正在计算市场参数准备出售...");
    setTxError(null);

    try {
      const wallet = wallets.find(w => w.address.toLowerCase() === walletAddress?.toLowerCase())
        || wallets.find(w => w.walletClientType === "privy")
        || wallets[0];

      const ethereumProvider = await wallet.getEthereumProvider();
      const provider = new ethers.providers.Web3Provider(ethereumProvider as any);
      const signer = provider.getSigner();

      const creds = getCachedCreds(wallet.address);
      if (!creds) throw new Error("API凭证过期，请重启");

      const clobClient = new ClobClient(CLOB_API_URL, POLYGON_CHAIN_ID, signer as any, creds, SIGNATURE_TYPE_GNOSIS_SAFE, proxyAddress);

      const parsedShares = Number(sharesToSell);
      if (!parsedShares || parsedShares <= 0) {
          throw new Error("无效的出售份额");
      }

      setTxStep("placing");
      setTxMessage("正在向 Polymarket 提交限制卖单保护(FOK)...");

      const tickSize = await clobClient.getTickSize(tokenId).catch(() => "0.01") as "0.1" | "0.01" | "0.001" | "0.0001";
      const negRisk = await clobClient.getNegRisk(tokenId).catch(() => false);

      // Apply 3% implicit slippage for SELL (we accept slightly lower sell price)
      const limitPrice = executionPrice 
          ? Math.max(Number((executionPrice - 0.03).toFixed(3)), 0.001) 
          : undefined;

      const resp = await clobClient.createAndPostMarketOrder({
        tokenID: tokenId,
        amount: parsedShares,
        side: "SELL" as any,
        price: limitPrice,
        orderType: "FOK" as any
      }, { tickSize, negRisk });

      if (resp && resp.success) {
        setTxStep("success");
        setTxMessage("卖出成功！大部分或全部份额已按市价被撮合。");
        setTxOrderId(resp.orderID || null);
        syncData(1500);
      } else {
        let errorMsg = resp?.error || JSON.stringify(resp);
        try {
          const parsed = JSON.parse(errorMsg);
          if (parsed?.data?.error) errorMsg = parsed.data.error;
        } catch (e) {}  
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error("Sell position error:", err);
      let finalMsg = err.message || String(err);

      if (finalMsg.toLowerCase().includes("timeout")) {
        setTxStep("error");
        setTxMessage("⚠️ 签名通道休眠，交易未发送，资产安全。即将为您重新激活页面...");
        setTxError("签名通道因长时间休眠已断开。页面将自动刷新以恢复连接，届时您可重新操作。");
        setTimeout(() => { window.location.reload(); }, 2000);
        return;
      }

      setTxStep("error");
      if (finalMsg.includes("user rejected")) finalMsg = "用户取消了签名请求。";
      
      setTxError(finalMsg);
      setTxMessage("出售操作执行失败");
    }
  };

  const handleLimitSellPosition = async (tokenId: string, sharesToSell: string, limitPrice: number) => {
    if (!authenticated || !wallets || wallets.length === 0 || !proxyAddress) return;

    setTxStep("preparing");
    setTxMessage("正在计算市场参数准备限价挂单...");
    setTxError(null);

    try {
      const wallet = wallets.find(w => w.address.toLowerCase() === walletAddress?.toLowerCase())
        || wallets.find(w => w.walletClientType === "privy")
        || wallets[0];

      const ethereumProvider = await wallet.getEthereumProvider();
      const provider = new ethers.providers.Web3Provider(ethereumProvider as any);
      const signer = provider.getSigner();

      const creds = getCachedCreds(wallet.address);
      if (!creds) throw new Error("API凭证过期，请重启");

      const clobClient = new ClobClient(CLOB_API_URL, POLYGON_CHAIN_ID, signer as any, creds, SIGNATURE_TYPE_GNOSIS_SAFE, proxyAddress);

      const parsedShares = Number(sharesToSell);
      if (!parsedShares || parsedShares <= 0 || !limitPrice || limitPrice <= 0) {
          throw new Error("无效的出售份额或价格");
      }

      setTxStep("placing");
      setTxMessage("正在向 Polygon 提交限价卖单...");

      const tickSize = await clobClient.getTickSize(tokenId).catch(() => "0.01") as "0.1" | "0.01" | "0.001" | "0.0001";
      const negRisk = await clobClient.getNegRisk(tokenId).catch(() => false);

      const resp = await clobClient.createAndPostOrder({
        tokenID: tokenId,
        size: parsedShares,
        price: limitPrice,
        side: "SELL" as any
      }, { tickSize, negRisk });

      if (resp && resp.success) {
        setTxStep("success");
        setTxMessage("限价卖单提交成功！等待市场买方吃单。");
        setTxOrderId(resp.orderID || null);
        syncData(1500);
      } else {
        let errorMsg = resp?.error || JSON.stringify(resp);
        try {
          const parsed = JSON.parse(errorMsg);
          if (parsed?.data?.error) errorMsg = parsed.data.error;
        } catch (e) {}  
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error("Limit sell error:", err);
      let finalMsg = err.message || String(err);

      if (finalMsg.toLowerCase().includes("timeout")) {
        setTxStep("error");
        setTxMessage("⚠️ 签名通道休眠，交易未发送，资产安全。即将为您重新激活页面...");
        setTxError("签名通道因长时间休眠已断开。页面将自动刷新以恢复连接，届时您可重新操作。");
        setTimeout(() => { window.location.reload(); }, 2000);
        return;
      }

      setTxStep("error");
      if (finalMsg.includes("user rejected")) finalMsg = "用户取消了签名请求。";
      
      setTxError(finalMsg);
      setTxMessage("限价卖出操作执行失败");
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
