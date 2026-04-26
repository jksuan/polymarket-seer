'use client';

import React from 'react';

interface LegalFooterProps {
  type?: 'legal' | 'about';
}

export function LegalFooter({ type = 'legal' }: LegalFooterProps) {
  return (
    <div className="mt-16 pt-8 border-t border-white/5 flex flex-col items-center gap-2 w-full">
      <span className="text-white/40 text-[11px] font-bold tracking-widest italic">
        {type === 'legal' ? 'Secured by Polymarket Protocol' : 'Next-gen Sports Prediction Interface'}
      </span>
      <p className="text-white/40 text-[11px] font-medium tracking-tight">
        © 2026 SEER.SPORTS. All rights reserved.
      </p>
    </div>
  );
}

export default function PrivacyContent() {
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
