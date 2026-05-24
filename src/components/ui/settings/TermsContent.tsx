'use client';

import React from 'react';
import { useTranslation } from "@/i18n";
import { LegalFooter } from './PrivacyContent';

function TermsContentEn() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Info */}
      <div className="mb-10">
        <div className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10">
          <span className="text-white/40 text-[10px] font-bold tracking-widest">
            Last Updated: April 27, 2026
          </span>
        </div>
      </div>

      <div className="space-y-12">
        {/* Section 1 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20 shrink-0">1</span>
            <h4 className="text-white text-lg font-bold">Acceptance of Terms & Consent by Action</h4>
          </div>
          <div className="space-y-4 text-white/70 text-[15px] leading-relaxed pl-9">
            <p>
              By accessing, browsing, or using dodoo.pro (the "App"), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 border-l-4 border-l-red-500">
              <p className="text-red-400/90 font-medium">
                <span className="font-bold">IMPORTANT:</span> By connecting your wallet, interacting with the smart contracts, or placing any trade/prediction within the App, you confirm your explicit acceptance of these Terms. If you do not agree to these terms, you must immediately cease all use of the App and its services.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20 shrink-0">2</span>
            <h4 className="text-white text-lg font-bold">Eligibility & Restricted Territories</h4>
          </div>
          <div className="space-y-6 text-white/70 text-[15px] leading-relaxed pl-9">
            <p>dodoo.pro is intended only for users in jurisdictions where prediction markets are legal.</p>
            <div className="space-y-4">
              <div>
                <p className="text-white font-semibold mb-1">Restricted Jurisdictions</p>
                <p>You must not access or use this App if you are a citizen, resident, or located in the United States, United Kingdom, or any other jurisdiction where such services are restricted or prohibited by law.</p>
              </div>
              <div>
                <p className="text-white font-semibold mb-1">Geoblocking Circumvention</p>
                <p>Users are strictly prohibited from using VPNs, proxy servers, or other location-masking technologies to bypass regional restrictions. dodoo.pro reserves the right to restrict or terminate access for any user suspected of such circumvention.</p>
              </div>
              <div>
                <p className="text-white font-semibold mb-1">Age Requirement</p>
                <p>You must be at least 18 years old (or the legal age of majority in your jurisdiction).</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20 shrink-0">3</span>
            <h4 className="text-white text-lg font-bold">Nature of Service (UI Interface Only)</h4>
          </div>
          <div className="space-y-6 text-white/70 text-[15px] leading-relaxed pl-9">
            <p>dodoo.pro acts solely as a decentralized user interface (UI) and gateway to the Polymarket protocol and other blockchain-based smart contracts.</p>
            <ul className="space-y-4 list-disc marker:text-[#00F0FF] ml-4">
              <li><span className="text-white font-semibold">No Custody:</span> We do not hold, manage, or have access to your private keys or digital assets. All assets are managed via the Privy authentication layer and stored on the blockchain.</li>
              <li><span className="text-white font-semibold">No Execution:</span> We do not execute trades or provide liquidity. All market matching and settlements are performed on-chain via third-party decentralized protocols.</li>
              <li><span className="text-white font-semibold">Protocol Risk:</span> We are not responsible for the performance, reliability, or security of the Polymarket protocol or the underlying blockchain networks (e.g., Polygon, Base).</li>
            </ul>
          </div>
        </section>

        {/* Section 4 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20 shrink-0">4</span>
            <h4 className="text-white text-lg font-bold">Risk Acknowledgement</h4>
          </div>
          <div className="space-y-4 text-white/70 text-[15px] leading-relaxed pl-9">
            <p>By using the App, you acknowledge and assume the following risks:</p>
            <ul className="space-y-4 list-disc marker:text-[#00F0FF] ml-4">
              <li><span className="text-white font-semibold">Financial Loss:</span> Trading in prediction markets involves high risk. You may lose all digital assets committed to a market.</li>
              <li><span className="text-white font-semibold">Smart Contract Vulnerabilities:</span> Blockchain technology is subject to technical risks, including bugs, hacks, or failures in smart contracts which are beyond our control.</li>
              <li><span className="text-white font-semibold">Regulatory Uncertainty:</span> The regulatory landscape for Web3 is evolving. Future legal changes may affect your ability to access the App.</li>
            </ul>
          </div>
        </section>

        {/* Section 5 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20 shrink-0">5</span>
            <h4 className="text-white text-lg font-bold">Limitation of Liability</h4>
          </div>
          <div className="space-y-4 text-white/70 text-[15px] leading-relaxed pl-9">
            <p>To the maximum extent permitted by law, dodoo.pro and its developers shall not be liable for any direct, indirect, incidental, or consequential damages, including but not limited to loss of funds, profits, or data, arising from:</p>
            <ul className="space-y-2 list-disc marker:text-[#00F0FF] ml-4">
              <li>Protocol-level failures or smart contract exploits.</li>
              <li>Errors in market data or odds provided by third-party APIs.</li>
              <li>Any unauthorized access to your wallet or login credentials.</li>
            </ul>
          </div>
        </section>

        {/* Section 6 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20 shrink-0">6</span>
            <h4 className="text-white text-lg font-bold">Prohibited Activities</h4>
          </div>
          <div className="space-y-4 text-white/70 text-[15px] leading-relaxed pl-9">
            <p>You agree not to:</p>
            <ul className="space-y-2 list-disc marker:text-[#00F0FF] ml-4">
              <li>Engage in market manipulation, wash trading, or any form of illicit betting.</li>
              <li>Attempt to reverse-engineer or disrupt the App's interface.</li>
              <li>Use the App for money laundering or financing illegal activities.</li>
            </ul>
          </div>
        </section>

        {/* Section 7 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20 shrink-0">7</span>
            <h4 className="text-white text-lg font-bold">Modifications</h4>
          </div>
          <p className="text-white/70 text-[15px] leading-relaxed pl-9">
            We reserve the right to modify these Terms at any time. Your continued use of the App or execution of new trades following any changes constitutes your acceptance of the updated Terms.
          </p>
        </section>

        {/* Section 8 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20 shrink-0">8</span>
            <h4 className="text-white text-lg font-bold">Governing Law</h4>
          </div>
          <p className="text-white/70 text-[15px] leading-relaxed pl-9">
            These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which the developer operates, without regard to its conflict of law provisions.
          </p>
        </section>

        {/* Section 9 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20 shrink-0">9</span>
            <h4 className="text-white text-lg font-bold">Contact Us</h4>
          </div>
          <p className="text-white/70 text-[15px] leading-relaxed pl-9">
            For any legal inquiries or reporting violations, please contact us via our official X (formerly Twitter) account.
          </p>
        </section>
      </div>

      <LegalFooter />
    </div>
  );
}

function TermsContentZh() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Info */}
      <div className="mb-10">
        <div className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10">
          <span className="text-white/40 text-[10px] font-bold tracking-widest">
            最后更新：2026年4月27日
          </span>
        </div>
      </div>

      <div className="space-y-12">
        {/* Section 1 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20 shrink-0">1</span>
            <h4 className="text-white text-lg font-bold">同意条款与行为确认</h4>
          </div>
          <div className="space-y-4 text-white/70 text-[15px] leading-relaxed pl-9">
            <p>
              当您访问、浏览或使用 dodoo.pro（简称“本应用”）时，即表示您承认已阅读、理解并同意接受本用户协议的约束。
            </p>
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 border-l-4 border-l-red-500">
              <p className="text-red-400/90 font-medium">
                <span className="font-bold">重要声明：</span> 通过连接您的钱包、与智能合约交互或在本应用内进行任何预测交易，您即确认明确接受本条款。若您不同意这些条款，请立即停止使用本应用及其所有服务。
              </p>
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20 shrink-0">2</span>
            <h4 className="text-white text-lg font-bold">资格审查与受限地区</h4>
          </div>
          <div className="space-y-6 text-white/70 text-[15px] leading-relaxed pl-9">
            <p>dodoo.pro 仅面向预测市场合法的司法管辖区的用户开放。</p>
            <div className="space-y-4">
              <div>
                <p className="text-white font-semibold mb-1">受限司法管辖区</p>
                <p>如果您是美国、英国或任何其他限制或禁止此类服务的司法管辖区的公民、居民或实际身处该地区，您不得访问或使用本应用。</p>
              </div>
              <div>
                <p className="text-white font-semibold mb-1">规避地理屏蔽</p>
                <p>严禁用户使用 VPN、代理服务器或其他位置伪装技术来绕过区域限制。dodoo.pro 保留对任何涉嫌此类规避行为的用户限制或终止访问权限的权利。</p>
              </div>
              <div>
                <p className="text-white font-semibold mb-1">年龄要求</p>
                <p>您必须年满 18 周岁（或达到您所在司法管辖区的法定成年年龄）。</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20 shrink-0">3</span>
            <h4 className="text-white text-lg font-bold">服务性质（仅前端界面）</h4>
          </div>
          <div className="space-y-6 text-white/70 text-[15px] leading-relaxed pl-9">
            <p>dodoo.pro 仅作为一个去中心化的用户界面（UI），是连接 Polymarket 协议及其他基于区块链的智能合约的网关。</p>
            <ul className="space-y-4 list-disc marker:text-[#00F0FF] ml-4">
              <li><span className="text-white font-semibold">无托管：</span> 我们不持有、不管理且无法访问您的私钥或数字资产。所有资产均通过 Privy 认证层管理，并安全存储在区块链上。</li>
              <li><span className="text-white font-semibold">无执行权限：</span> 我们不执行交易，也不提供流动性。所有市场匹配和结算都在链上通过第三方去中心化协议完成。</li>
              <li><span className="text-white font-semibold">协议风险：</span> 我们对 Polymarket 协议或底层区块链网络（如 Polygon, Base）的性能、可靠性或安全性概不负责。</li>
            </ul>
          </div>
        </section>

        {/* Section 4 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20 shrink-0">4</span>
            <h4 className="text-white text-lg font-bold">风险告知</h4>
          </div>
          <div className="space-y-4 text-white/70 text-[15px] leading-relaxed pl-9">
            <p>使用本应用即表示您知晓并承担以下风险：</p>
            <ul className="space-y-4 list-disc marker:text-[#00F0FF] ml-4">
              <li><span className="text-white font-semibold">资金损失：</span> 预测市场交易具有极高风险，您可能会损失投入市场的所有数字资产。</li>
              <li><span className="text-white font-semibold">智能合约漏洞：</span> 区块链技术存在技术风险，包括超出我们控制范围的智能合约漏洞、黑客攻击或系统故障。</li>
              <li><span className="text-white font-semibold">监管不确定性：</span> Web3 的监管环境在不断演变，未来相关法律的变更可能会影响您访问本应用的能力。</li>
            </ul>
          </div>
        </section>

        {/* Section 5 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20 shrink-0">5</span>
            <h4 className="text-white text-lg font-bold">责任限制</h4>
          </div>
          <div className="space-y-4 text-white/70 text-[15px] leading-relaxed pl-9">
            <p>在法律允许的最大范围内，因以下原因造成的任何直接、间接、附带或后果性损害（包括但不限于资金、利润或数据损失），dodoo.pro 及其开发者概不负责：</p>
            <ul className="space-y-2 list-disc marker:text-[#00F0FF] ml-4">
              <li>协议级别的故障或智能合约漏洞。</li>
              <li>第三方 API 提供的市场数据或赔率错误。</li>
              <li>任何未经授权访问您的钱包或登录凭证的行为。</li>
            </ul>
          </div>
        </section>

        {/* Section 6 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20 shrink-0">6</span>
            <h4 className="text-white text-lg font-bold">禁止行为</h4>
          </div>
          <div className="space-y-4 text-white/70 text-[15px] leading-relaxed pl-9">
            <p>您同意不进行以下行为：</p>
            <ul className="space-y-2 list-disc marker:text-[#00F0FF] ml-4">
              <li>参与市场操纵、洗盘交易或任何形式的非法对赌。</li>
              <li>试图逆向工程或破坏本应用的界面运作。</li>
              <li>利用本应用进行洗钱或资助非法活动。</li>
            </ul>
          </div>
        </section>

        {/* Section 7 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20 shrink-0">7</span>
            <h4 className="text-white text-lg font-bold">协议修改</h4>
          </div>
          <p className="text-white/70 text-[15px] leading-relaxed pl-9">
            我们保留随时修改本条款的权利。一旦相关条款变更，您继续使用本应用或执行新交易，即构成您对更新后条款的接受。
          </p>
        </section>

        {/* Section 8 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20 shrink-0">8</span>
            <h4 className="text-white text-lg font-bold">适用法律</h4>
          </div>
          <p className="text-white/70 text-[15px] leading-relaxed pl-9">
            本条款受开发者运营所在司法管辖区法律管辖并据其解释，且不考虑其冲突法规定。
          </p>
        </section>

        {/* Section 9 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20 shrink-0">9</span>
            <h4 className="text-white text-lg font-bold">联系我们</h4>
          </div>
          <p className="text-white/70 text-[15px] leading-relaxed pl-9">
            如有任何法律疑问或违规举报，请通过官方 X（原 Twitter）账户联系我们。
          </p>
        </section>
      </div>

      <LegalFooter />
    </div>
  );
}

export default function TermsContent() {
  const { locale } = useTranslation();
  return locale === 'zh' ? <TermsContentZh /> : <TermsContentEn />;
}
