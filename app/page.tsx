"use client";

import { useState } from "react";
import { Navbar, type Tab } from "@/components/Navbar";
import { NationsCupPage }   from "@/components/NationsCupPage";
import { GroupsPage }       from "@/components/GroupsPage";
import { TopScorerPage }    from "@/components/TopScorerPage";
import { LeaderboardPage }  from "@/components/LeaderboardPage";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("nations");

  return (
    <div className="min-h-screen">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === "nations"     && <NationsCupPage />}
        {activeTab === "groups"      && <GroupsPage />}
        {activeTab === "scorer"      && <TopScorerPage />}
        {activeTab === "leaderboard" && <LeaderboardPage />}
      </main>
    </div>
  );
}
