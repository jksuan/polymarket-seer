'use client';

import React from 'react';
import { LegalFooter } from './PrivacyContent';

export default function TermsContent() {
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
              By accessing, browsing, or using SEER.SPORTS (the "App"), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
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
            <p>SEER.SPORTS is intended only for users in jurisdictions where prediction markets are legal.</p>
            <div className="space-y-4">
              <div>
                <p className="text-white font-semibold mb-1">Restricted Jurisdictions</p>
                <p>You must not access or use this App if you are a citizen, resident, or located in the United States, United Kingdom, or any other jurisdiction where such services are restricted or prohibited by law.</p>
              </div>
              <div>
                <p className="text-white font-semibold mb-1">Geoblocking Circumvention</p>
                <p>Users are strictly prohibited from using VPNs, proxy servers, or other location-masking technologies to bypass regional restrictions. SEER.SPORTS reserves the right to restrict or terminate access for any user suspected of such circumvention.</p>
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
            <p>SEER.SPORTS acts solely as a decentralized user interface (UI) and gateway to the Polymarket protocol and other blockchain-based smart contracts.</p>
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
            <p>To the maximum extent permitted by law, SEER.SPORTS and its developers shall not be liable for any direct, indirect, incidental, or consequential damages, including but not limited to loss of funds, profits, or data, arising from:</p>
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
