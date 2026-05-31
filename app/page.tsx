"use client";

import { useState, useEffect, useCallback } from "react";
import { useReadContract } from "wagmi";
import { Navbar, type Tab } from "@/components/Navbar";
import { NationsCupPage }   from "@/components/NationsCupPage";
import { GroupsPage }       from "@/components/GroupsPage";
import { TopScorerPage }    from "@/components/TopScorerPage";
import { LeaderboardPage }  from "@/components/LeaderboardPage";
import { ActivityPage }     from "@/components/ActivityPage";
import { HoldersTicker }    from "@/components/HoldersTicker";
import { PrizeCounter }     from "@/components/PrizeCounter";
import { LoadingScreen }    from "@/components/LoadingScreen";
import { ABI }              from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/config";

const STORAGE_KEY = "abs_active_tab";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("nations");
  const [appReady, setAppReady]   = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  // Prefetch the main contract call so we know when data is ready
  const { data: poolData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "getAllCountryPools",
  });

  const isDataReady = poolData !== undefined;

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Tab | null;
    const valid: Tab[] = ["nations", "groups", "scorer", "leaderboard"];
    if (saved && valid.includes(saved)) setActiveTab(saved);
  }, []);

  const handleLoadDone = useCallback(() => {
    setShowLoader(false);
    setAppReady(true);
  }, []);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    localStorage.setItem(STORAGE_KEY, tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {showLoader && (
        <LoadingScreen isReady={isDataReady} onDone={handleLoadDone} />
      )}
      <div className="min-h-screen" style={{ visibility: appReady ? "visible" : "hidden" }}>
        <HoldersTicker />
        <Navbar activeTab={activeTab} onTabChange={handleTabChange} />
        <PrizeCounter />
        <main className="max-w-7xl mx-auto px-4 py-6">
          {activeTab === "nations"     && <NationsCupPage />}
          {activeTab === "groups"      && <GroupsPage />}
          {activeTab === "scorer"      && <TopScorerPage />}
          {activeTab === "leaderboard" && <LeaderboardPage />}
          {activeTab === "activity"    && <ActivityPage />}
        </main>
      </div>
    </>
  );
}
