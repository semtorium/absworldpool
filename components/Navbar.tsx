"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { LangSwitcher } from "./LangSwitcher";
import { ProfileDrawer } from "./ProfileDrawer";
import { useLang } from "@/lib/LanguageContext";
import { shortenAddress } from "@/lib/config";
import { Wallet, ChevronDown } from "lucide-react";

export type Tab = "nations" | "scorer" | "groups" | "leaderboard" | "activity";

interface NavbarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

function AddressAvatar({ address }: { address: string }) {
  const colors = [
    ["#00ff88", "#7c3aed"],
    ["#f59e0b", "#ef4444"],
    ["#3b82f6", "#8b5cf6"],
    ["#10b981", "#06b6d4"],
  ];
  const idx    = parseInt(address.slice(2, 4), 16) % colors.length;
  const [c1, c2] = colors[idx];
  return (
    <div className="w-8 h-8 rounded-xl shrink-0"
      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }} />
  );
}

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const { address, isConnected } = useAccount();
  const { login }                = useLoginWithAbstract();
  const { t }                    = useLang();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: "nations",     label: t.tab_nations,     emoji: "🌍" },
    { id: "scorer",      label: t.tab_scorer,      emoji: "⚽" },
    { id: "groups",      label: t.tab_groups,      emoji: "📋" },
    { id: "leaderboard", label: t.tab_leaderboard, emoji: "🏆" },
    { id: "activity",    label: t.tab_activity,    emoji: "📡" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full"
        style={{ background: "rgba(0,20,10,0.20)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(0,255,136,0.15)" }}>
        <div className="max-w-7xl mx-auto px-4">

          {/* Top Row */}
          <div className="flex items-center justify-between h-16 gap-3">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0 no-underline"
              style={{ textDecoration: "none" }}>
              <span className="font-black text-white tracking-tight"
                style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "clamp(0.9rem,3vw,1.05rem)" }}>
                ABS<span style={{ color: "#00ff88" }}>WorldPool</span>
                <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 700 }}> 26</span>
              </span>
            </Link>

            {/* Right: Lang + Wallet/Profile */}
            <div className="flex items-center gap-2 shrink-0">
              <LangSwitcher />

              {isConnected && address ? (
                /* Profile Button */
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(0,255,136,0.3)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}>
                  <AddressAvatar address={address} />
                  <span className="font-mono text-sm font-semibold text-white hidden sm:block">
                    {shortenAddress(address)}
                  </span>
                  <ChevronDown size={14} style={{ color: "#6b7a9a" }} />
                </button>
              ) : (
                /* Connect Button — opens AGW native modal */
                <button
                  onClick={() => login()}
                  className="btn-neon flex items-center gap-2 text-sm px-4 py-2">
                  <Wallet size={15} />
                  <span className="hidden sm:block">{t.connect}</span>
                </button>
              )}
            </div>
          </div>

          {/* Tabs — centered */}
          <div className="flex justify-center pb-3">
            <div className="flex items-center gap-1">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-all duration-150 ${
                    activeTab === tab.id ? "tab-pill-active" : "tab-pill-inactive"
                  }`}>
                  <span>{tab.emoji}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Profile Drawer */}
      <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
