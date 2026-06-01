"use client";

import { useState, useEffect } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/config";
import { COUNTRIES } from "@/lib/countries";
import { CountryCard } from "./CountryCard";
import { Loader2, Trophy } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

// June 11 2026 16:00 UTC — opening match kick-off
const TOURNAMENT_START = new Date("2026-06-11T16:00:00Z").getTime();

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, TOURNAMENT_START - Date.now()));

  useEffect(() => {
    const tick = () => setTimeLeft(Math.max(0, TOURNAMENT_START - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (timeLeft <= 0) return null;

  const totalSecs = Math.floor(timeLeft / 1000);
  const days  = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins  = Math.floor((totalSecs % 3600) / 60);
  const secs  = totalSecs % 60;
  const lastHour = days === 0 && hours === 0; // switch to min+sec when < 1h
  return { days, hours, mins, secs, lastHour };
}

const FILTERS = ["ALL", "YOURS"] as const;
type Filter = typeof FILTERS[number];

export function NationsCupPage() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const countdown = useCountdown();
  const { address } = useAccount();
  const { t } = useLang();

  const { data: allPools, isLoading }    = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "getAllCountryPools", query: { refetchInterval: 5_000 } });
  const { data: tournamentFinalized }    = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "tournamentFinalized" });
  const { data: winningCountryId }       = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "winningCountryId" });
  const { data: eliminationStatus }      = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "getAllEliminationStatus", query: { refetchInterval: 30_000 } });
  const { data: contractPaused }         = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "paused" });

  // Mint is "closed" when contract is paused OR tournament is finalized
  const mintClosed = !!contractPaused || !!tournamentFinalized;
  const { data: userBalance }         = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: "balanceOf",
    args: address && winningCountryId ? [address, winningCountryId] : undefined,
    query: { enabled: !!address && !!tournamentFinalized },
  });

  // Fetch all 48 country balances for the YOURS filter
  const { data: allBalances } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: "balanceOfBatch",
    args: address
      ? [
          Array(COUNTRIES.length).fill(address),
          COUNTRIES.map(c => BigInt(c.id)),
        ]
      : undefined,
    query: { enabled: !!address, refetchInterval: 30_000 },
  });

  const { writeContract: claim, data: claimHash, isPending: isClaiming } = useWriteContract();
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({ hash: claimHash });

  // Build a Set of owned country ids for fast lookup
  const ownedIds = new Set<number>(
    allBalances
      ? COUNTRIES.filter((_, i) => Number(allBalances[i] ?? 0n) > 0).map(c => c.id)
      : []
  );

  const baseList = filter === "YOURS"
    ? COUNTRIES.filter(c => ownedIds.has(c.id))
    : COUNTRIES;

  const filtered = baseList
    .slice()
    .sort((a, b) => {
      const pa = allPools?.[a.id] ?? 0n;
      const pb = allPools?.[b.id] ?? 0n;
      if (pa !== pb) return pb > pa ? 1 : -1;
      return a.favoriteRank - b.favoriteRank;
    });

  const canClaim  = tournamentFinalized && userBalance && Number(userBalance) > 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Teams card */}
        <div className="glass-card p-4 text-center">
          <p className="text-[11px] uppercase tracking-widest font-semibold mb-2" style={{ color: "#6b7a9a" }}>{t.nc_teams}</p>
          <p className="text-xl font-black font-mono text-white">48</p>
        </div>

        {/* Countdown / Live card */}
        <div className="glass-card p-4 text-center">
          <p className="text-[11px] uppercase tracking-widest font-semibold mb-2" style={{ color: "#6b7a9a" }}>{t.nc_status}</p>
          {tournamentFinalized ? (
            <p className="text-xl font-black text-white">{t.nc_finalized}</p>
          ) : countdown === null ? (
            <div className="flex items-center justify-center gap-1.5">
              <div className="live-dot" />
              <span className="text-xl font-black" style={{ color: "#00ff88" }}>LIVE</span>
            </div>
          ) : (
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#00ff88" }}>
                LIVE IN
              </p>
              <div className="flex items-baseline justify-center gap-0.5 font-mono font-black text-white">
                {countdown.lastHour ? (
                  // last hour: show mm:ss
                  <>
                    <span className="text-xl">{String(countdown.mins).padStart(2, "0")}</span>
                    <span className="text-sm" style={{ color: "#6b7a9a" }}>m</span>
                    <span className="mx-1 text-sm" style={{ color: "#6b7a9a" }}>:</span>
                    <span className="text-xl">{String(countdown.secs).padStart(2, "0")}</span>
                    <span className="text-sm" style={{ color: "#6b7a9a" }}>s</span>
                  </>
                ) : (
                  // normal: d · h · m
                  <>
                    {countdown.days > 0 && (
                      <><span className="text-xl">{countdown.days}</span><span className="text-xs" style={{ color: "#6b7a9a" }}>d</span><span className="mx-1 text-sm" style={{ color: "#6b7a9a" }}>·</span></>
                    )}
                    <span className="text-xl">{String(countdown.hours).padStart(2, "0")}</span>
                    <span className="text-xs" style={{ color: "#6b7a9a" }}>h</span>
                    <span className="mx-1 text-sm" style={{ color: "#6b7a9a" }}>·</span>
                    <span className="text-xl">{String(countdown.mins).padStart(2, "0")}</span>
                    <span className="text-xs" style={{ color: "#6b7a9a" }}>m</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
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
      <div className="flex gap-2">
        <button onClick={() => setFilter("ALL")}
          className={`px-4 py-1.5 text-xs font-bold transition-all duration-150 ${
            filter === "ALL" ? "tab-pill-active" : "tab-pill-inactive"
          }`}>
          {t.nc_filter_all}
        </button>
        <button onClick={() => setFilter("YOURS")}
          className={`px-4 py-1.5 text-xs font-bold transition-all duration-150 flex items-center gap-1.5 ${
            filter === "YOURS" ? "tab-pill-active" : "tab-pill-inactive"
          }`}
          style={filter === "YOURS" ? {} : { borderColor: "rgba(251,191,36,0.2)", color: "#fbbf24" }}>
          <span>⚽</span>
          <span>My NFTs</span>
          {ownedIds.size > 0 && (
            <span style={{
              background: filter === "YOURS" ? "rgba(0,255,136,0.25)" : "rgba(251,191,36,0.15)",
              borderRadius: "99px",
              padding: "0 5px",
              fontSize: "10px",
              fontWeight: 900,
            }}>
              {ownedIds.size}
            </span>
          )}
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 size={36} className="animate-spin" style={{ color: "#00ff88" }} />
          <p style={{ color: "#6b7a9a" }}>{t.nc_loading}</p>
        </div>
      ) : filter === "YOURS" && filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <span style={{ fontSize: "48px" }}>⚽</span>
          <p className="font-bold text-white text-lg">No NFTs yet</p>
          <p className="text-sm" style={{ color: "#6b7a9a" }}>
            {address ? "Mint a country NFT to support your nation!" : "Connect your wallet to see your NFTs"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {filtered.map((country) => (
            <CountryCard key={country.id} country={country}
              poolWei={allPools?.[country.id] ?? 0n}
              isWinner={!!tournamentFinalized && Number(winningCountryId) === country.id}
              isEliminated={eliminationStatus?.[country.id] ?? false}
              mintClosed={mintClosed}
              openSeaUrl={`https://opensea.io/assets/abstract/${CONTRACT_ADDRESS}/${country.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
