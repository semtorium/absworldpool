"use client";

import { useMemo, useEffect } from "react";
import Image from "next/image";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Zap, Loader2 } from "lucide-react";
import { ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS, TOP_SCORER_PLAYERS } from "@/lib/config";
import { getFlagUrl } from "@/lib/countries";

const CONFETTI_COLORS = [
  "#00ff88", "#7c3aed", "#fbbf24", "#ef4444",
  "#3b82f6", "#f97316", "#ec4899", "#06b6d4",
];

interface Props {
  winnerName: string;
  onClose: () => void;
  onClaimed: () => void;
}

export function TopScorerWinnerModal({ winnerName, onClose, onClaimed }: Props) {
  const { address, isConnected } = useAccount();

  const winner = TOP_SCORER_PLAYERS.find(p => p.name === winnerName);

  const { data: userVotesData } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: "getUserVotesForPlayer",
    args: address ? [address, winnerName] : undefined,
    query: { enabled: !!address },
  });
  const { data: totalVotesData } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: "getPlayerVotes",
    args: [winnerName],
  });
  const { data: finalPool } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: "finalTopScorerPool",
  });

  const uVotes  = Number(userVotesData ?? 0n);
  const tVotes  = Number(totalVotesData ?? 0n);
  const pool    = Number(finalPool ?? 0n);
  const claimable = tVotes > 0 && uVotes > 0
    ? (pool * 0.95 / tVotes * uVotes) / 1e18
    : 0;

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess && address) {
      localStorage.setItem(`ts_claimed_${address.toLowerCase()}`, "true");
      onClaimed();
    }
  }, [isSuccess, address, onClaimed]);

  const pieces = useMemo(() =>
    Array.from({ length: 90 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: `${(Math.random() * 100).toFixed(1)}%`,
      delay: `${(Math.random() * 1.5).toFixed(2)}s`,
      duration: `${(2 + Math.random() * 1.5).toFixed(2)}s`,
      size: `${6 + Math.floor(Math.random() * 8)}px`,
      borderRadius: Math.random() > 0.55 ? "50%" : "2px",
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  const canClaim = isConnected && uVotes > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,8,16,0.93)", backdropFilter: "blur(10px)" }}
    >
      {/* Confetti */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {pieces.map(p => (
          <div key={p.id} style={{
            position: "absolute", top: "-20px", left: p.left,
            width: p.size, height: p.size, background: p.color,
            borderRadius: p.borderRadius,
            animation: `confettiFall ${p.duration} ${p.delay} ease-in forwards`,
          }} />
        ))}
      </div>

      {/* Card */}
      <div
        className="glass-card relative w-full max-w-lg overflow-y-auto"
        style={{
          maxHeight: "92vh",
          padding: "32px 24px 28px",
          borderColor: "rgba(124,58,237,0.45)",
          boxShadow: "0 0 80px rgba(124,58,237,0.18), 0 0 160px rgba(124,58,237,0.05)",
          animation: "modalPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">⚽</div>
          <h2 className="text-2xl font-black text-white">Golden Boot Winner!</h2>
          <p className="text-sm mt-1" style={{ color: "#6b7a9a" }}>
            The 2026 FIFA World Cup top scorer has been crowned
          </p>
        </div>

        {/* Winner big card */}
        <div
          className="flex items-center gap-4 p-5 rounded-2xl mb-5"
          style={{
            background: "rgba(124,58,237,0.08)",
            border: "2px solid rgba(124,58,237,0.5)",
            boxShadow: "0 0 30px rgba(124,58,237,0.15)",
          }}
        >
          {winner && (
            <div className="relative w-10 h-7 rounded overflow-hidden shrink-0">
              <Image src={getFlagUrl(winner.flag, 80)} alt={winner.country} fill className="object-cover" unoptimized />
            </div>
          )}
          <div className="flex-1">
            <p className="font-black text-white text-2xl">{winnerName}</p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: "#a78bfa" }}>
              {winner?.country ?? "Unknown"} · 🥇 Golden Boot
            </p>
          </div>
          <Zap size={36} style={{ color: "#a78bfa", flexShrink: 0 }} />
        </div>

        {/* User claim info */}
        {canClaim && (
          <div className="p-4 rounded-2xl mb-5"
            style={{ background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.3)" }}>
            <p className="font-bold text-white mb-3">🎉 You voted correctly!</p>
            <div className="space-y-1.5 text-sm mb-4">
              <div className="flex justify-between">
                <span style={{ color: "#6b7a9a" }}>Your Votes</span>
                <span className="font-bold text-white">{uVotes} ticket{uVotes > 1 ? "s" : ""}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#6b7a9a" }}>Total Votes on Winner</span>
                <span className="font-bold text-white">{tVotes.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#6b7a9a" }}>Your Reward</span>
                <span className="font-black font-mono" style={{ color: "#00ff88" }}>~{claimable.toFixed(5)} ETH</span>
              </div>
            </div>
            <button
              onClick={() => writeContract({
                address: CONTRACT_ADDRESS, abi: ABI,
                functionName: "claimTopScorerRewards", args: [],
              })}
              disabled={isPending || isConfirming || isSuccess}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm"
              style={{
                background: isSuccess ? "rgba(124,58,237,0.15)" : "linear-gradient(135deg,#7c3aed,#6d28d9)",
                color: isSuccess ? "#a78bfa" : "#fff",
                border: isSuccess ? "1px solid rgba(124,58,237,0.3)" : "none",
                cursor: isPending || isConfirming || isSuccess ? "not-allowed" : "pointer",
              }}
            >
              {(isPending || isConfirming) && <Loader2 size={16} className="animate-spin" />}
              {isSuccess ? "✓ Claimed!" : isPending || isConfirming ? "Confirming…" : "Claim ETH Reward"}
            </button>
          </div>
        )}

        {!isConnected && (
          <div className="p-4 rounded-2xl mb-5 text-center"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-sm" style={{ color: "#6b7a9a" }}>Connect your wallet to check if you have rewards to claim.</p>
          </div>
        )}

        {isConnected && uVotes === 0 && (
          <div className="p-4 rounded-2xl mb-5 text-center"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-sm" style={{ color: "#6b7a9a" }}>
              You didn&apos;t vote for <span className="font-semibold text-white">{winnerName}</span> — no rewards to claim.
            </p>
          </div>
        )}

        {/* All 50 players list */}
        <div className="mb-5">
          <p className="text-xs uppercase tracking-widest font-bold mb-3" style={{ color: "#6b7a9a" }}>
            All Players
          </p>
          <div className="space-y-1 overflow-y-auto pr-1" style={{ maxHeight: 260 }}>
            {TOP_SCORER_PLAYERS.map(p => {
              const isWin = p.name === winnerName;
              return (
                <div
                  key={p.name}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl"
                  style={{
                    background: isWin ? "rgba(124,58,237,0.1)" : "rgba(255,255,255,0.015)",
                    border: isWin ? "1px solid rgba(124,58,237,0.4)" : "1px solid transparent",
                    opacity: isWin ? 1 : 0.3,
                    filter: isWin ? "none" : "grayscale(80%)",
                  }}
                >
                  <Image
                    src={getFlagUrl(p.flag, 40)} alt={p.country}
                    width={22} height={15}
                    className="rounded object-cover shrink-0" unoptimized
                  />
                  <span className="text-sm font-semibold flex-1 truncate"
                    style={{ color: isWin ? "#fff" : "#b0bcd4" }}>
                    {p.name}
                  </span>
                  <span className="text-xs shrink-0" style={{ color: isWin ? "#a78bfa" : "#6b7a9a" }}>
                    {isWin ? "🥇 Winner" : p.country}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl text-sm font-bold"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#6b7a9a", cursor: "pointer" }}
        >
          {canClaim ? "Close (claim later)" : "Close"}
        </button>
      </div>
    </div>
  );
}
