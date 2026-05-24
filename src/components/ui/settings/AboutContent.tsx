'use client';

import React from 'react';
import { useTranslation } from "@/i18n";
import { APP_BRAND_NAME, APP_LOGO_ALT, APP_LOGO_URL } from "@/lib/brandAssets";
import { LegalFooter } from './PrivacyContent';

function AboutContentEn() {
  return (
    <div className="flex flex-col items-center pt-8 text-center animate-in fade-in zoom-in-95 duration-500">
      {/* Brand Identity */}
      <div className="mb-8">
        <img
          src={APP_LOGO_URL}
          alt={APP_LOGO_ALT}
          className="w-28 h-28 object-contain mx-auto"
        />
      </div>

      <h2 className="text-3xl font-black text-white mb-2 tracking-tight">{APP_BRAND_NAME}</h2>
      <div className="inline-block px-3 py-0.5 rounded-full bg-[#00F0FF]/10 border border-[#00F0FF]/20 mb-8">
        <span className="text-[#00F0FF] font-bold text-[11px] uppercase tracking-widest">Version 1.0.0</span>
      </div>
      
      <p className="text-white/70 text-lg leading-relaxed mb-12 max-w-[320px] mx-auto font-medium">
        Next-generation sports prediction market built on the world's most liquid prediction protocol.
      </p>

      {/* Social Links */}
      <div className="flex justify-center w-full mb-4">
        <a 
          href="#" 
          className="group w-full max-w-[180px] bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 p-5 rounded-[1.5rem] flex flex-col items-center gap-3 transition-all active:scale-95"
        >
          <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center border border-white/5 group-hover:border-[#1DA1F2]/50 transition-colors">
            <svg className="w-6 h-6 text-white group-hover:text-[#1DA1F2] transition-colors" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </div>
          <span className="text-white text-sm font-bold tracking-wide">Follow on X</span>
        </a>
      </div>

      <LegalFooter type="about" />
    </div>
  );
}

function AboutContentZh() {
  return (
    <div className="flex flex-col items-center pt-8 text-center animate-in fade-in zoom-in-95 duration-500">
      {/* Brand Identity */}
      <div className="mb-8">
        <img
          src={APP_LOGO_URL}
          alt={APP_LOGO_ALT}
          className="w-28 h-28 object-contain mx-auto"
        />
      </div>

      <h2 className="text-3xl font-black text-white mb-2 tracking-tight">{APP_BRAND_NAME}</h2>
      <div className="inline-block px-3 py-0.5 rounded-full bg-[#00F0FF]/10 border border-[#00F0FF]/20 mb-8">
        <span className="text-[#00F0FF] font-bold text-[11px] uppercase tracking-widest">Version 1.0.0</span>
      </div>
      
      <p className="text-white/70 text-lg leading-relaxed mb-12 max-w-[320px] mx-auto font-medium">
        构建于全球最具流动性协议之上的次世代体育预测市场。
      </p>

      {/* Social Links */}
      <div className="flex justify-center w-full mb-4">
        <a 
          href="#" 
          className="group w-full max-w-[180px] bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 p-5 rounded-[1.5rem] flex flex-col items-center gap-3 transition-all active:scale-95"
        >
          <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center border border-white/5 group-hover:border-[#1DA1F2]/50 transition-colors">
            <svg className="w-6 h-6 text-white group-hover:text-[#1DA1F2] transition-colors" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </div>
          <span className="text-white text-sm font-bold tracking-wide">在 X 上关注我们</span>
        </a>
      </div>

      <LegalFooter type="about" />
    </div>
  );
}

export default function AboutContent() {
  const { locale } = useTranslation();
  return locale === 'zh' ? <AboutContentZh /> : <AboutContentEn />;
}
