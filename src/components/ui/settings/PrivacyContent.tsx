'use client';

import React from 'react';
import { useTranslation } from "@/i18n";

interface LegalFooterProps {
  type?: 'legal' | 'about';
}

export function LegalFooter({ type = 'legal' }: LegalFooterProps) {
  const { locale } = useTranslation();
  
  const securedText = locale === 'zh' ? '由 Polymarket 协议提供安全保障' : 'Secured by Polymarket Protocol';
  const aboutText = locale === 'zh' ? '次世代体育预测终端' : 'Next-gen Sports Prediction Interface';
  const copyrightText = locale === 'zh' ? '© 2026 SEER.SPORTS. 保留所有权利。' : '© 2026 SEER.SPORTS. All rights reserved.';

  return (
    <div className="mt-16 pt-8 border-t border-white/5 flex flex-col items-center gap-2 w-full">
      <span className="text-white/40 text-[11px] font-bold tracking-widest italic">
        {type === 'legal' ? securedText : aboutText}
      </span>
      <p className="text-white/40 text-[11px] font-medium tracking-tight">
        {copyrightText}
      </p>
    </div>
  );
}

function PrivacyContentEn() {
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

      {/* Introduction */}
      <div className="relative mb-12 p-5 rounded-2xl bg-white/[0.03] border border-white/5">
        <h3 className="text-white font-bold text-lg mb-2">Introduction</h3>
        <p className="text-white/80 text-[15px] leading-relaxed font-medium">
          Welcome to <span className="text-white font-bold">SEER.SPORTS</span> (the "App"), a decentralized sports prediction platform. We are committed to protecting your privacy while providing a seamless Web3 prediction experience.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-12">
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20">1</span>
            <h4 className="text-white text-lg font-bold">Information Collection</h4>
          </div>
          <div className="space-y-6 text-white/70 text-[15px] leading-relaxed pl-9">
            <div>
              <p className="text-white font-semibold mb-1">Wallet & Authentication Data</p>
              <p>We utilize Privy for secure wallet creation and authentication. This may include your wallet address and any email or social media handles used during the login process.</p>
            </div>
            <div>
              <p className="text-white font-semibold mb-1">On-Chain Data</p>
              <p>As a Web3 application, your wallet address, transaction history, and smart contract interactions are recorded on public blockchains (e.g., Polygon, Base). <span className="text-[#00F0FF]/80 italic">Blockchain data is public, permanent, and immutable.</span></p>
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Usage Data</p>
              <p>We may collect anonymous technical data, such as browser type, device information, and interface interaction logs, to optimize the performance of our application.</p>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20">2</span>
            <h4 className="text-white text-lg font-bold">How We Use Your Data</h4>
          </div>
          <ul className="space-y-4 text-white/70 text-[15px] leading-relaxed pl-9 list-disc marker:text-[#00F0FF]">
            <li><span className="text-white font-semibold">Service Provision:</span> To facilitate interactions with World Cup markets, display your portfolio, and manage active positions.</li>
            <li><span className="text-white font-semibold">Transaction Processing:</span> To interface with the Polymarket protocol for market matching and order execution.</li>
            <li><span className="text-white font-semibold">Security & Maintenance:</span> To monitor for fraudulent activity and ensure the stability of the App's infrastructure.</li>
            <li><span className="text-white font-semibold">User Experience:</span> To remember your preferences and provide a personalized sports dashboard.</li>
          </ul>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20">3</span>
            <h4 className="text-white text-lg font-bold">Third-Party Services</h4>
          </div>
          <div className="space-y-4 text-white/70 text-[15px] leading-relaxed pl-9">
            <p>Our App acts as a gateway to decentralized protocols. Your data usage is also subject to the privacy policies of our key infrastructure partners:</p>
            <ul className="space-y-4 list-disc marker:text-[#00F0FF] mt-4 ml-4">
              <li><span className="text-white font-semibold">Privy:</span> Handles secure wallet generation and identity authentication.</li>
              <li><span className="text-white font-semibold">Polymarket:</span> Provides the underlying liquidity and market-clearing logic.</li>
              <li><span className="text-white font-semibold">Blockchain Networks:</span> Transactions are processed by decentralized nodes; we do not control the operations of these networks.</li>
            </ul>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20">4</span>
            <h4 className="text-white text-lg font-bold">Data Sharing and Disclosure</h4>
          </div>
          <div className="space-y-4 text-white/70 text-[15px] leading-relaxed pl-9">
            <p><span className="text-white font-semibold">No Sale of Data:</span> We do not sell, rent, or trade your personal information to third parties for marketing purposes.</p>
            <p><span className="text-white font-semibold">Legal Requirements:</span> We may disclose information if required by law or in response to valid requests by public authorities.</p>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20">5</span>
            <h4 className="text-white text-lg font-bold">Information Security</h4>
          </div>
          <p className="text-white/70 text-[15px] leading-relaxed pl-9">
            We implement industry-standard security measures to protect data stored locally. However, since the App interacts with decentralized protocols, the security of your digital assets also depends on the safety of your login credentials and the underlying smart contracts. <span className="text-white font-bold italic underline decoration-[#00F0FF]/30">You are responsible for maintaining the confidentiality of your Privy account and credentials.</span>
          </p>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20">6</span>
            <h4 className="text-white text-lg font-bold">Your Rights</h4>
          </div>
          <p className="text-white/70 text-[15px] leading-relaxed pl-9">
            Depending on your jurisdiction, you may have the right to access, correct, or delete your data held on our private servers. <span className="text-red-400 font-medium">Important: We cannot modify or delete any data recorded on the blockchain.</span>
          </p>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20">7</span>
            <h4 className="text-white text-lg font-bold">Policy Changes</h4>
          </div>
          <p className="text-white/70 text-[15px] leading-relaxed pl-9">
            We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last Updated" date at the top of this page.
          </p>
        </section>
      </div>

      {/* Contact Section */}
      <div className="mt-16 p-6 rounded-2xl bg-gradient-to-br from-[#1DA1F2]/10 to-transparent border border-[#1DA1F2]/20 text-center">
        <h4 className="text-white font-bold mb-2">Need Help?</h4>
        <p className="text-white/60 text-sm mb-4">Questions regarding this Privacy Policy?</p>
        <a 
          href="#" 
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1DA1F2] text-white font-bold text-sm hover:scale-105 active:scale-95 transition-all"
        >
          Contact via X.com
        </a>
      </div>

      <LegalFooter />
    </div>
  );
}

function PrivacyContentZh() {
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

      {/* Introduction */}
      <div className="relative mb-12 p-5 rounded-2xl bg-white/[0.03] border border-white/5">
        <h3 className="text-white font-bold text-lg mb-2">引言</h3>
        <p className="text-white/80 text-[15px] leading-relaxed font-medium">
          欢迎使用去中心化体育预测平台 <span className="text-white font-bold">SEER.SPORTS</span>（简称“本应用”）。我们在为您提供流畅的 Web3 预测体验的同时，致力于保护您的隐私安全。
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-12">
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20">1</span>
            <h4 className="text-white text-lg font-bold">信息收集</h4>
          </div>
          <div className="space-y-6 text-white/70 text-[15px] leading-relaxed pl-9">
            <div>
              <p className="text-white font-semibold mb-1">钱包与认证数据</p>
              <p>我们使用 Privy 进行安全的钱包创建和身份认证。这可能包括您的钱包地址以及在登录过程中使用的电子邮件或社交媒体账号。</p>
            </div>
            <div>
              <p className="text-white font-semibold mb-1">链上数据</p>
              <p>作为 Web3 应用，您的钱包地址、交易记录及智能合约交互行为将被记录在公开的区块链（如 Polygon, Base）上。<span className="text-[#00F0FF]/80 italic">区块链数据是公开、永久且不可篡改的。</span></p>
            </div>
            <div>
              <p className="text-white font-semibold mb-1">使用数据</p>
              <p>我们可能会收集匿名的技术数据（如浏览器类型、设备信息、界面交互日志等）来优化应用程序的性能。</p>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20">2</span>
            <h4 className="text-white text-lg font-bold">数据使用方式</h4>
          </div>
          <ul className="space-y-4 text-white/70 text-[15px] leading-relaxed pl-9 list-disc marker:text-[#00F0FF]">
            <li><span className="text-white font-semibold">服务提供：</span> 用于与世界杯预测市场交互、展示您的投资组合及管理活跃仓位。</li>
            <li><span className="text-white font-semibold">交易处理：</span> 用于对接 Polymarket 协议以完成市场匹配和订单执行。</li>
            <li><span className="text-white font-semibold">安全与维护：</span> 用于监控欺诈活动并确保应用基础设施的稳定性。</li>
            <li><span className="text-white font-semibold">用户体验：</span> 用于记录您的偏好并提供个性化的体育数据面板。</li>
          </ul>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20">3</span>
            <h4 className="text-white text-lg font-bold">第三方服务</h4>
          </div>
          <div className="space-y-4 text-white/70 text-[15px] leading-relaxed pl-9">
            <p>本应用充当去中心化协议的网关。您的数据使用同时也受以下核心基础设施合作伙伴隐私政策的约束：</p>
            <ul className="space-y-4 list-disc marker:text-[#00F0FF] mt-4 ml-4">
              <li><span className="text-white font-semibold">Privy:</span> 负责安全的钱包生成与身份认证。</li>
              <li><span className="text-white font-semibold">Polymarket:</span> 提供底层的流动性与市场清算逻辑。</li>
              <li><span className="text-white font-semibold">Blockchain Networks:</span> 交易由去中心化节点处理；我们无法控制这些网络的运作。</li>
            </ul>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20">4</span>
            <h4 className="text-white text-lg font-bold">数据共享与披露</h4>
          </div>
          <div className="space-y-4 text-white/70 text-[15px] leading-relaxed pl-9">
            <p><span className="text-white font-semibold">不涉及数据买卖：</span> 我们绝不会向第三方出售、出租或交易您的个人信息以用于营销目的。</p>
            <p><span className="text-white font-semibold">法律要求：</span> 若法律规定或响应公共机构的合法请求，我们可能会披露相关信息。</p>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20">5</span>
            <h4 className="text-white text-lg font-bold">信息安全</h4>
          </div>
          <p className="text-white/70 text-[15px] leading-relaxed pl-9">
            我们采用行业标准的安全措施来保护本地存储的数据。然而，由于本应用与去中心化协议交互，您数字资产的安全很大程度上也取决于您的登录凭证及底层智能合约的安全性。<span className="text-white font-bold italic underline decoration-[#00F0FF]/30">您必须自行负责妥善保管您的 Privy 账户与登录凭证。</span>
          </p>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20">6</span>
            <h4 className="text-white text-lg font-bold">您的权利</h4>
          </div>
          <p className="text-white/70 text-[15px] leading-relaxed pl-9">
            根据您所在司法管辖区的法律，您可能有权访问、更正或删除存储在我们私有服务器上的数据。<span className="text-red-400 font-medium">重要提示：我们无法修改或删除任何已经记录在区块链上的数据。</span>
          </p>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white font-bold text-xs ring-1 ring-white/20">7</span>
            <h4 className="text-white text-lg font-bold">政策更新</h4>
          </div>
          <p className="text-white/70 text-[15px] leading-relaxed pl-9">
            我们可能会不时更新本隐私政策。一旦有任何变更，我们将通过更新页面顶部的“最后更新”日期来通知您。
          </p>
        </section>
      </div>

      {/* Contact Section */}
      <div className="mt-16 p-6 rounded-2xl bg-gradient-to-br from-[#1DA1F2]/10 to-transparent border border-[#1DA1F2]/20 text-center">
        <h4 className="text-white font-bold mb-2">需要帮助？</h4>
        <p className="text-white/60 text-sm mb-4">对隐私政策有任何疑问？</p>
        <a 
          href="#" 
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1DA1F2] text-white font-bold text-sm hover:scale-105 active:scale-95 transition-all"
        >
          通过 X.com 联系我们
        </a>
      </div>

      <LegalFooter />
    </div>
  );
}

export default function PrivacyContent() {
  const { locale } = useTranslation();
  return locale === 'zh' ? <PrivacyContentZh /> : <PrivacyContentEn />;
}
