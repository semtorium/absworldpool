"use client";

import { useState, useEffect, useCallback } from "react";
import { useReadContract, useAccount } from "wagmi";
import { Navbar, type Tab }              from "@/components/Navbar";
import { NationsCupPage }                from "@/components/NationsCupPage";
import { GroupsPage }                    from "@/components/GroupsPage";
import { TopScorerPage }                 from "@/components/TopScorerPage";
import { LeaderboardPage }               from "@/components/LeaderboardPage";
import { ActivityPage }                  from "@/components/ActivityPage";
import { HoldersTicker }                 from "@/components/HoldersTicker";
import { PrizeCounter }                  from "@/components/PrizeCounter";
import { LoadingScreen }                 from "@/components/LoadingScreen";
import { TermsModal }                    from "@/components/TermsModal";
import { NationsCupWinnerModal }         from "@/components/NationsCupWinnerModal";
import { TopScorerWinnerModal }          from "@/components/TopScorerWinnerModal";
import { ABI }                           from "@/lib/abi";
import { CONTRACT_ADDRESS }              from "@/lib/config";

const STORAGE_KEY = "abs_active_tab";

export default function Home() {
  const [activeTab, setActiveTab]       = useState<Tab>("nations");
  const [appReady, setAppReady]         = useState(false);
  const [showLoader, setShowLoader]     = useState(true);
  const [showTerms, setShowTerms]       = useState(false);
  const [showNcWinner, setShowNcWinner] = useState(false);
  const [showTsWinner, setShowTsWinner] = useState(false);

  const { address } = useAccount();

  // Prefetch pools (controls loading screen)
  const { data: poolData } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: "getAllCountryPools",
  });

  // Finalization state
  const { data: ncFinalized }      = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "tournamentFinalized" });
  const { data: tsFinalized }      = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "topScorerFinalized" });
  const { data: winningCountryId } = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "winningCountryId" });
  const { data: finalTopScorer }   = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "finalTopScorer" });

  const isDataReady = poolData !== undefined;

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Tab | null;
    const valid: Tab[] = ["nations", "groups", "scorer", "leaderboard"];
    if (saved && valid.includes(saved)) setActiveTab(saved);
  }, []);

  // Decide which winner modals to show after app is ready
  useEffect(() => {
    if (!appReady) return;
    const addr = address?.toLowerCase() ?? "";

    const ncClaimed = addr && localStorage.getItem(`nc_claimed_${addr}`) === "true";
    const tsClaimed = addr && localStorage.getItem(`ts_claimed_${addr}`) === "true";

    if (ncFinalized && !ncClaimed) {
      setShowNcWinner(true);
    } else if (tsFinalized && !tsClaimed) {
      setShowTsWinner(true);
    }
  }, [appReady, ncFinalized, tsFinalized, address]);

  // When NC modal closes, check if TS should follow
  const handleNcClose = useCallback(() => {
    setShowNcWinner(false);
    const addr = address?.toLowerCase() ?? "";
    const tsClaimed = addr && localStorage.getItem(`ts_claimed_${addr}`) === "true";
    if (tsFinalized && !tsClaimed) {
      setShowTsWinner(true);
    }
  }, [tsFinalized, address]);

  const handleLoadDone = useCallback(() => {
    setShowLoader(false);
    const accepted = localStorage.getItem("tos_accepted") === "true";
    if (accepted) {
      setAppReady(true);
    } else {
      setShowTerms(true);
    }
  }, []);

  const handleTermsAccept = useCallback(() => {
    setShowTerms(false);
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
      {showTerms && (
        <TermsModal onAccept={handleTermsAccept} />
      )}
      {showNcWinner && ncFinalized && winningCountryId !== undefined && (
        <NationsCupWinnerModal
          winningCountryId={Number(winningCountryId)}
          onClose={handleNcClose}
          onClaimed={handleNcClose}
        />
      )}
      {showTsWinner && tsFinalized && finalTopScorer && (
        <TopScorerWinnerModal
          winnerName={finalTopScorer as string}
          onClose={() => setShowTsWinner(false)}
          onClaimed={() => setShowTsWinner(false)}
        />
      )}
      <div className="min-h-screen" style={{ visibility: appReady ? "visible" : "hidden" }}>
        <HoldersTicker />
        <Navbar activeTab={activeTab} onTabChange={handleTabChange} />
        <PrizeCounter activeTab={activeTab} />
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
