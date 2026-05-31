"use client";

import { useState } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS, formatEth } from "@/lib/config";
import { COUNTRIES } from "@/lib/countries";
import { CountryCard } from "./CountryCard";
import { Loader2, Trophy } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

const CONTINENTS = ["ALL", "UEFA", "CONMEBOL", "CONCACAF", "CAF", "AFC", "OFC"];

export function NationsCupPage() {
  const [filter, setFilter] = useState("ALL");
  const { address } = useAccount();
  const { t } = useLang();

  const { data: allPools, isLoading } = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "getAllCountryPools" });
  const { data: tournamentFinalized } = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "tournamentFinalized" });
  const { data: winningCountryId }    = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "winningCountryId" });
  const { data: userBalance }         = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: "balanceOf",
    args: address && winningCountryId ? [address, winningCountryId] : undefined,
    query: { enabled: !!address && !!tournamentFinalized },
  });

  const { writeContract: claim, data: claimHash, isPending: isClaiming } = useWriteContract();
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({ hash: claimHash });

  const filtered = (filter === "ALL" ? COUNTRIES : COUNTRIES.filter(c => c.continent === filter))
    .slice()
    .sort((a, b) => {
      const pa = allPools?.[a.id] ?? 0n;
      const pb = allPools?.[b.id] ?? 0n;
      if (pa !== pb) return pb > pa ? 1 : -1; // pool descending when different
      return a.favoriteRank - b.favoriteRank; // fallback: odds favourite first
    });

  const totalPool = allPools ? allPools.slice(1).reduce((s, p) => s + p, 0n) : 0n;
  const canClaim  = tournamentFinalized && userBalance && Number(userBalance) > 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t.nc_pool,   value: isLoading ? "…" : `${formatEth(totalPool)} ETH`, accent: true },
          { label: t.nc_teams,  value: "48",   accent: false },
          { label: t.nc_status, value: tournamentFinalized ? t.nc_finalized : t.nc_live, accent: false },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className="text-[11px] uppercase tracking-widest font-semibold mb-2" style={{ color: "#6b7a9a" }}>{s.label}</p>
            <p className={`text-xl font-black font-mono ${s.accent ? "text-gradient" : "text-white"}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Claim */}
      {canClaim && (
        <div className="glass-card p-5 flex items-center justify-between gap-4"
          style={{ borderColor: "rgba(251,191,36,0.4)", background: "rgba(251,191,36,0.05)" }}>
          <div className="flex items-center gap-3">
            <Trophy size={24} style={{ color: "#fbbf24" }} />
            <div>
              <p className="font-bold text-white">{t.nc_claim_title}</p>
              <p className="text-sm" style={{ color: "#6b7a9a" }}>
                {userBalance?.toString()} {t.nc_claim_sub}
              </p>
            </div>
          </div>
          <button
            onClick={() => claim({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "claimNationsCupRewards", args: [] })}
            disabled={isClaiming || isClaimConfirming}
            className="btn-neon flex items-center gap-2 whitespace-nowrap"
            style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)", boxShadow: "0 0 20px rgba(251,191,36,0.3)" }}>
            {(isClaiming || isClaimConfirming) && <Loader2 size={16} className="animate-spin" />}
            {isClaimSuccess ? t.nc_claimed : t.nc_claim_btn}
          </button>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {CONTINENTS.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className={`px-3 py-1.5 text-xs font-bold transition-all duration-150 ${
              filter === c ? "tab-pill-active" : "tab-pill-inactive"
            }`}>
            {c === "ALL" ? t.nc_filter_all : c}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 size={36} className="animate-spin" style={{ color: "#00ff88" }} />
          <p style={{ color: "#6b7a9a" }}>{t.nc_loading}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {filtered.map((country) => (
            <CountryCard key={country.id} country={country}
              poolWei={allPools?.[country.id] ?? 0n}
              isWinner={tournamentFinalized && Number(winningCountryId) === country.id}
              isEliminated={!!tournamentFinalized && Number(winningCountryId) !== country.id} />
          ))}
        </div>
      )}
    </div>
  );
}
