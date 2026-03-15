"use client";

import { useState, useCallback, useEffect } from "react";
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
  SIGNATURE_TYPE_GNOSIS_SAFE,
  ZERO_PARENT_COLLECTION_ID,
} from "@/lib/constants";
import { getCachedCreds, setCachedCreds } from "@/lib/utils";

export type TxStep = "idle" | "preparing" | "deploying" | "approving" | "placing" | "success" | "error";

export function useTrading(
  walletAddress: string,
  proxyAddress: string | null,
  fetchBalance: () => void
) {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  // --- Transaction Progress Overlay States ---
  const [txStep, setTxStep] = useState<TxStep>("idle");
  const [txMessage, setTxMessage] = useState("");
  const [txOrderId, setTxOrderId] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  // --- Portfolio 资产组合状态 ---
  const [positions, setPositions] = useState<any[]>([]);
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);

  // --- 逻辑：获取资产组合数据 ---
  const fetchPortfolio = useCallback(async (proxyAddr: string, walletAddress: string) => {
    if (!proxyAddr || !walletAddress) return;

    // Check creds before pulling CLOB data
    const creds = getCachedCreds(walletAddress);
    if (!creds) return; // If API keys aren't ready, we skip

    // Find the right wallet to sign with clob
    const walletInfo = wallets.find(w => w.address.toLowerCase() === walletAddress?.toLowerCase())
      || wallets.find(w => w.walletClientType === "privy")
      || wallets[0];
    if (!walletInfo) return;

    try {
      setPortfolioLoading(true);

      const ethereumProvider = await walletInfo.getEthereumProvider();
      const provider = new ethers.providers.Web3Provider(ethereumProvider as any);
      const signer = provider.getSigner();

      // 同时发起两个 API 请求：持仓 + 活动记录
      const [posRes, activityRes] = await Promise.all([
        fetch(`${DATA_API_URL}/positions?user=${proxyAddr}`),
        fetch(`${DATA_API_URL}/activity?user=${proxyAddr}`)
      ]);

      // 解析持仓
      if (posRes.ok) {
        const posData = await posRes.json();
        setPositions(Array.isArray(posData) ? posData : []);
      }

      // 解析活动
      if (activityRes.ok) {
        const actData = await activityRes.json();
        setTrades(Array.isArray(actData) ? actData : []);
      }

      // 3. 从 CLOB SDK 获取挂单
      const clob = new ClobClient(CLOB_API_URL, POLYGON_CHAIN_ID, signer, creds, SIGNATURE_TYPE_GNOSIS_SAFE, proxyAddr);
      const orders = await clob.getOpenOrders().catch(() => []);
      setOpenOrders(orders || []);

    } catch (err) {
      console.error("fetchPortfolio error:", err);
    } finally {
      setPortfolioLoading(false);
    }
  }, [wallets]);

  // Auto-fetch portfolio when authenticated and proxy is ready
  useEffect(() => {
    if (authenticated && proxyAddress && walletAddress) {
      fetchPortfolio(proxyAddress, walletAddress);
    }
  }, [authenticated, proxyAddress, walletAddress, fetchPortfolio]);

  // --- 逻辑：执行领奖 (Redeem) ---
  const handleRedeem = async (pos: any) => {
    if (!pos || !proxyAddress) return;

    setTxStep("preparing");
    setTxMessage("正在构造领奖交易请求...");
    setTxError(null);

    try {
      const wallet = wallets.find(w => w.address.toLowerCase() === walletAddress?.toLowerCase()) || wallets[0];
      const ethereumProvider = await wallet.getEthereumProvider();
      const provider = new ethers.providers.Web3Provider(ethereumProvider as any);
      const signer = provider.getSigner();

      // 构造智能合约调用数据
      const ctfInterface = new ethers.utils.Interface(CTF_ABI);
      const parentCollectionId = ZERO_PARENT_COLLECTION_ID;
      // 将 outcomeIndex 转换为 indexSets 格式
      const indexSets = [Math.pow(2, pos.outcomeIndex)];

      const builderConfig = new BuilderConfig({ remoteBuilderConfig: { url: `${window.location.origin}/api/sign` } });
      const relayClient = new RelayClient(RELAYER_URL, POLYGON_CHAIN_ID, signer as any, builderConfig, RelayerTxType.SAFE);

      setTxStep("placing");
      setTxMessage("正在通过 Relayer 激活资产并提取奖励...");

      const tx = await relayClient.execute([{
        to: ADDRESSES.CTF,
        data: ctfInterface.encodeFunctionData("redeemPositions", [ADDRESSES.USDCe, parentCollectionId, pos.conditionId, indexSets]),
        value: "0"
      }], "Redeem Positions");

      setTxMessage("领奖交易已广播，等待区块链状态更新...");
      await tx.wait();

      setTxStep("success");
      setTxMessage(`恭喜！奖励已成功领取，资金已划转至您的金库。`);
    } catch (err: any) {
      console.error("领奖错误:", err);
      setTxStep("error");
      setTxError(err.message || String(err));
      setTxMessage("领奖请求执行失败");
    }
  };

  const handlePlaceRealBet = async (amount: string) => {
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

      setTxMessage("正在获取活跃市场数据...");
      const activeMarkets = await clobClientWithCreds.getSamplingSimplifiedMarkets();
      const liveTokenId = activeMarkets.data[0]?.tokens[0]?.token_id;
      if (!liveTokenId) throw new Error("未获取到活跃交易对，请稍后重试");

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
      setTxMessage("正在向 Polymarket 提交市价买入订单...");
      const resp = await clobClientWithCreds.createAndPostMarketOrder({
        tokenID: liveTokenId, amount: 1.00, side: "BUY" as any
      });

      if (resp && resp.success) {
        setTxStep("success");
        setTxMessage("下注成功！订单已被 Polymarket 撮合引擎接受。");
        setTxOrderId(resp.orderID || null);
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
      setTxStep("error");

      let finalMsg = err.message || String(err);
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

  const closeTxOverlay = () => {
    setTxStep("idle");
    setTxMessage("");
    setTxOrderId(null);
    setTxError(null);
    if (proxyAddress) {
      fetchBalance();
    }
  };

  return {
    txStep, setTxStep,
    txMessage, setTxMessage,
    txOrderId, setTxOrderId,
    txError, setTxError,
    positions, setPositions,
    openOrders, setOpenOrders,
    trades, setTrades,
    portfolioLoading,
    fetchPortfolio,
    handleRedeem,
    handlePlaceRealBet,
    closeTxOverlay
  };
}
