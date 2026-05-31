"use client";

import { useState, useEffect } from "react";
import { Navbar, type Tab } from "@/components/Navbar";
import { NationsCupPage }   from "@/components/NationsCupPage";
import { GroupsPage }       from "@/components/GroupsPage";
import { TopScorerPage }    from "@/components/TopScorerPage";
import { LeaderboardPage }  from "@/components/LeaderboardPage";
import { HoldersTicker }    from "@/components/HoldersTicker";
import { PrizeCounter }     from "@/components/PrizeCounter";

const STORAGE_KEY = "abs_active_tab";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("nations");

  // Restore last active tab from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Tab | null;
    const valid: Tab[] = ["nations", "groups", "scorer", "leaderboard"];
    if (saved && valid.includes(saved)) setActiveTab(saved);
  }, []);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    localStorage.setItem(STORAGE_KEY, tab);
  };

  return (
    <div className="min-h-screen">
      <HoldersTicker />
      <Navbar activeTab={activeTab} onTabChange={handleTabChange} />
      <PrizeCounter />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === "nations"     && <NationsCupPage />}
        {activeTab === "groups"      && <GroupsPage />}
        {activeTab === "scorer"      && <TopScorerPage />}
        {activeTab === "leaderboard" && <LeaderboardPage />}
      </main>
    </div>
  );
}
