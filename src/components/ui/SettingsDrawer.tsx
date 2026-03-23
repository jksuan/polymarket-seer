'use client';

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Globe,
  Shield,
  FileText,
  HelpCircle,
  ChevronRight,
  Bell,
  Moon,
  LogOut,
  Info,
} from "lucide-react";

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  authenticated?: boolean;
  onLogout?: () => void;
}

const SETTINGS_GROUPS = [
  {
    title: "偏好设置",
    items: [
      { icon: Globe, label: "语言", value: "中文", color: "#00F0FF" },
      { icon: Bell, label: "通知设置", value: "已开启", color: "#ADFF2F" },
      { icon: Moon, label: "外观", value: "暗黑模式", color: "#A78BFA" },
    ],
  },
  {
    title: "帮助与支持",
    items: [
      { icon: HelpCircle, label: "帮助中心", value: "", color: "#60A5FA" },
      { icon: Info, label: "关于 SEER.SPORTS", value: "v1.0.0", color: "#F59E0B" },
    ],
  },
  {
    title: "法律与隐私",
    items: [
      { icon: Shield, label: "隐私政策", value: "", color: "#34D399" },
      { icon: FileText, label: "用户协议", value: "", color: "#34D399" },
    ],
  },
];

function DrawerContent({ isOpen, onClose, authenticated = false, onLogout }: SettingsDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="settings-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9998,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
          />

          {/* Drawer Panel */}
          <motion.div
            key="settings-drawer"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 9999,
              maxWidth: "448px",
              margin: "0 auto",
              background: "linear-gradient(180deg, #1A0D2E 0%, #0D0518 100%)",
              borderRadius: "24px 24px 0 0",
              border: "1px solid rgba(255,255,255,0.08)",
              borderBottom: "none",
              boxShadow: "0 -24px 80px rgba(0,0,0,0.8)",
              maxHeight: "85vh",
              overflowY: "auto" as const,
            }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div
                style={{
                  width: "40px",
                  height: "4px",
                  borderRadius: "2px",
                  background: "rgba(255,255,255,0.15)",
                }}
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4">
              <h2
                style={{
                  fontFamily: "Inter",
                  fontWeight: 900,
                  fontSize: "20px",
                  color: "#dee5ff",
                  letterSpacing: "-0.5px",
                }}
              >
                设置
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <X size={16} color="#a3aac4" />
              </button>
            </div>

            {/* Settings Groups */}
            <div className="px-4 pb-12 flex flex-col gap-6 mt-2">
              {SETTINGS_GROUPS.map((group) => (
                <div key={group.title}>
                  <div
                    className="text-xs font-bold uppercase tracking-widest mb-2 px-1"
                    style={{ color: "rgba(163,170,196,0.5)" }}
                  >
                    {group.title}
                  </div>
                  <div
                    className="rounded-2xl overflow-hidden"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {group.items.map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.label}
                          className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white/5 transition-colors"
                          style={{
                            borderBottom:
                              idx < group.items.length - 1
                                ? "1px solid rgba(255,255,255,0.05)"
                                : "none",
                          }}
                        >
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                              background: `${item.color}18`,
                              border: `1px solid ${item.color}30`,
                            }}
                          >
                            <Icon size={16} color={item.color} />
                          </div>
                          <span
                            className="flex-1 text-left"
                            style={{
                              fontFamily: "Inter",
                              fontWeight: 600,
                              fontSize: "15px",
                              color: "#dee5ff",
                            }}
                          >
                            {item.label}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {item.value && (
                              <span style={{ fontSize: "13px", fontWeight: 500, color: "#a3aac4" }}>
                                {item.value}
                              </span>
                            )}
                            <ChevronRight size={16} color="#4a5270" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Logout Button */}
              {authenticated && (
                <button
                  onClick={() => {
                    onClose();
                    if (onLogout) onLogout();
                  }}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 rounded-2xl active:scale-95 transition-all"
                  style={{
                    background: "rgba(255,68,68,0.08)",
                    border: "1px solid rgba(255,68,68,0.25)",
                    color: "#ff6b6b",
                    fontFamily: "Inter",
                    fontWeight: 700,
                    fontSize: "15px",
                  }}
                >
                  <LogOut size={16} />
                  退出登录
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function SettingsDrawer(props: SettingsDrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <DrawerContent {...props} />,
    document.body
  );
}
