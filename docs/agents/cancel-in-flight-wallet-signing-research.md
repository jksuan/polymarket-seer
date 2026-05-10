# 调研：取消进行中的钱包签名 / 发交易请求

**范围**：`polymarket-seer` 中 Connected 钱包充值路径（`executeConnectedOrder` → EVM 提供方）。**目的**：判断在用户离开确认页/抽屉时，能否在应用层**主动取消**仍挂起的签名或发交易，并自动关闭钱包弹窗。

**结论（摘要）**：

- **EIP-1193 与主流注入钱包没有标准的「取消当前待处理 eth_sendTransaction」RPC**，应用侧无法像 `fetch` 一样用 `AbortController` 可靠地取消一次已发出的 `eth_sendTransaction` 请求并关闭扩展弹窗。
- 本仓库当前实现通过 **Privy 钱包的 `getEthereumProvider()`** 走标准 JSON-RPC；**可做的主要是 UI/状态与陈旧 Promise 结果隔离**（已实现 `confirmAttemptGeneration`），**不能依赖「程序关弹窗」**。
- 可选的增强仅限：**产品提示**（「若已离开本页，请在钱包中拒绝或取消本次请求」）、以及个别连接器自有 API（见下文），**不具备跨钱包的可移植性**。

---

## 1. 本仓库当前调用链（为何会与 UI 脱节）

Connected 充值执行入口：`src/components/ui/deposit/executor.ts` 中 `executeConnectedOrder`。

1. `getWalletEthereumProvider(wallet)`：`wallet` 来自 `@privy-io/react-auth` 的 `useWallets()`；获取 **EIP-1193 Provider**。
2. `switchEvmChain`：`wallet_switchEthereumChain`（可能弹出网络切换确认）。
3. `approveErc20IfNeeded`：必要时 **ERC20 `approve`**：合约调用底层仍是 **`eth_sendTransaction`**，并在链上 `wait()`。
4. `sendPreparedEvmTx`：`src/components/ui/deposit/evm.ts` 中通过 `ethers` 的 `Web3Provider.send("eth_sendTransaction", [...])` 发交易，随后 **`waitForTransaction`**。

因此「等待钱包确认」可能对应：**切换链、Approve、主交易** 中任一一步注入钱包弹窗；每一步在协议层都是**阻塞直到用户确认或拒绝**，或直到超时 / 失败。

---

## 2. 标准能力与业界现状

| 能力 | 说明 |
|------|------|
| **EIP-1193** | 定义 `provider.request({ method, params })`，**未规定**取消尚未完成的 request。 |
| **`eth_sendTransaction`** | 返回取决于用户在钱包 UI 中批准或拒绝；**拒绝**会表现为 Promise reject。**应用侧没有标准 method 去「撤回」已发往钱包插件的请求**。 |
| **MetaMask 等扩展** | 历史上有关于 JSON-RPC 层面 cancel 的讨论（如 metamask-extension #4225），**不构成稳定的公开 API**；弹窗关闭一般由用户在钱包内点击取消/拒绝。 |
| **AbortController** | 对浏览器 `fetch` 有效；**对已提交的 EIP-1193 调用一般不生效**，因底层未与 AbortSignal 绑定。 |

---

## 3. 与本项目相关的实现层面的可选动作（有限）

1. **丢弃陈旧异步结果**（已在 `DepositDrawer` 用 generation 实现）  
   用户返回上一页后，即使钱包仍在等待签名，`executeConnectedOrder` 最终 resolve/reject 时可忽略写入，避免 **UI 与链上状态错乱**。这不关闭钱包弹窗。

2. **Privy / Wallet SDK**  
   需在对应文档中确认是否存在 **`disconnect`**、**reject pending session**、或移动端 SDK 的专有取消接口；若有，通常**仅对该连接器有效**，不能当作通用方案。

3. **WalletConnect**（若未来接入）  
   会话层可能对「待处理请求」有拒绝路径；需按 WC 版本单独集成，**与当前 Privy + 注入 Provider 路径不同**。

4. **嵌入式钱包 / App 内 WebView**  
   若 Privy 某类钱包在可控 WebView 内弹出，理论上可由宿主关闭容器，属产品形态问题，**不等同于 EIP-1193 取消**。

---

## 4. 产品与安全层面的建议

- **默认假设**：用户从页面返回后，**钱包弹窗可能仍存在**；应在文案或轻提示中说明：**请到钱包中取消本次签名**，避免误以为「返回页面 = 取消链上请求」。
- **不要做**：静默假定请求已取消而去发起另一笔易混淆的交易（除非业务上有明确的 nonce / 状态协调）。
- **与既有修复的关系**：「重置 `isExecuting` + generation」负责 **Web 应用状态机**；本文调研针对 **钱包 UI**，二者互补，不可替代。

---

## 5. 若后续要坚持「可取消」的研发方向（选题）

1. 研读 **Privy** 当前使用的连接器文档（Ethereum Provider 行为、移动端 vs 扩展）。
2. 评估是否引入 **交易编排层**（例如统一封装请求 ID，仅在支持的连接器上调用专有 cancel）。
3. 在测试矩阵（MetaMask、OKX、Rainbow、移动端内置浏览器）上手动验证：**返回页面后弹窗是否仍存在**，作为 UX 验收标准。

---

## 6. 参考文献（外部）

- EIP-1193: Ethereum Provider JavaScript API  
- MetaMask / JSON-RPC cancellation 相关讨论（GitHub issue #4225 等）——**仅为社区讨论，非稳定规范**

---

*文档日期：2026-05-10；实现路径以 `src/components/ui/deposit/evm.ts`、`executor.ts` 为准。*
