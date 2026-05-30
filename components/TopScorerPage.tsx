"use client";

import { useState } from "react";
import Image from "next/image";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Loader2, Ticket, Trophy, Zap } from "lucide-react";
import { ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS, TICKET_PRICE, TOP_SCORER_PLAYERS, formatEth } from "@/lib/config";
import { getFlagUrl } from "@/lib/countries";
import { useLang } from "@/lib/LanguageContext";

export function TopScorerPage() {
  const { address, isConnected } = useAccount();
  const { t } = useLang();
  const [ticketQty, setTicketQty]     = useState(1);
  const [voteAmounts, setVoteAmounts] = useState<Record<string, number>>({});

  const { data: ticketBalance }      = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "userUnusedTickets", args: address ? [address] : undefined, query: { enabled: !!address } });
  const { data: topScorerPool }      = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "topScorerPoolBalance" });
  const { data: topScorerFinalized } = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "topScorerFinalized" });
  const { data: finalTopScorer }     = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "finalTopScorer" });

  const playerVoteQueries = TOP_SCORER_PLAYERS.map(p =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "getPlayerVotes", args: [p.name] })
  );

  const { writeContract: buyTickets, data: buyHash, isPending: isBuying } = useWriteContract();
  const { isLoading: isBuyConfirming, isSuccess: isBuySuccess } = useWaitForTransactionReceipt({ hash: buyHash });
  const { writeContract: vote, isPending: isVoting }             = useWriteContract();
  const { writeContract: claim, data: claimHash, isPending: isClaiming } = useWriteContract();
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({ hash: claimHash });

  const unusedTickets = Number(ticketBalance ?? 0n);
  const totalCost     = TICKET_PRICE * BigInt(ticketQty);

  const playersWithVotes = TOP_SCORER_PLAYERS
    .map((p, i) => ({ ...p, votes: Number(playerVoteQueries[i].data ?? 0n) }))
    .sort((a, b) => b.votes - a.votes);

  const maxVotes = Math.max(...playersWithVotes.map(p => p.votes), 1);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4 text-center">
          <p className="text-[11px] uppercase tracking-widest font-semibold mb-2" style={{ color: "#6b7a9a" }}>{t.ts_pool}</p>
          <p className="text-2xl font-black font-mono text-gradient">{formatEth(topScorerPool ?? 0n)} ETH</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-[11px] uppercase tracking-widest font-semibold mb-2" style={{ color: "#6b7a9a" }}>{t.ts_tickets}</p>
          <p className="text-2xl font-black text-white">{isConnected ? unusedTickets : "—"}</p>
        </div>
      </div>

      {/* Claim */}
      {topScorerFinalized && isConnected && (
        <div className="glass-card p-5 flex items-center justify-between gap-4"
          style={{ borderColor: "rgba(251,191,36,0.4)", background: "rgba(251,191,36,0.05)" }}>
          <div>
            <p className="font-bold text-white flex items-center gap-2">
              <Trophy size={18} style={{ color: "#fbbf24" }} /> {t.ts_finalized}
            </p>
            <p className="text-sm mt-0.5" style={{ color: "#6b7a9a" }}>
              {t.ts_winner}: <span className="text-white font-semibold">{finalTopScorer as string}</span>
            </p>
          </div>
          <button onClick={() => claim({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "claimTopScorerRewards", args: [] })}
            disabled={isClaiming || isClaimConfirming}
            className="btn-neon flex items-center gap-2"
            style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)" }}>
            {(isClaiming || isClaimConfirming) && <Loader2 size={16} className="animate-spin" />}
            {isClaimSuccess ? "✓" : t.ts_claim}
          </button>
        </div>
      )}

      {/* Buy tickets */}
      {!topScorerFinalized && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,rgba(0,255,136,0.2),rgba(124,58,237,0.2))", border: "1px solid rgba(0,255,136,0.2)" }}>
              <Ticket size={20} style={{ color: "#00ff88" }} />
            </div>
            <div>
              <h2 className="font-black text-white text-lg">{t.ts_buy_title}</h2>
              <p className="text-xs" style={{ color: "#6b7a9a" }}>{t.ts_buy_sub}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 p-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <button onClick={() => setTicketQty(Math.max(1, ticketQty - 1))}
                className="btn-ghost rounded-lg px-3 py-2 text-lg font-bold">−</button>
              <span className="flex-1 text-center font-black text-xl text-white">{ticketQty}</span>
              <button onClick={() => setTicketQty(ticketQty + 1)}
                className="btn-ghost rounded-lg px-3 py-2 text-lg font-bold">+</button>
            </div>
            <button
              onClick={() => buyTickets({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "buyScorerTickets", args: [BigInt(ticketQty)], value: totalCost })}
              disabled={!isConnected || isBuying || isBuyConfirming}
              className="btn-neon flex items-center gap-2 whitespace-nowrap">
              {(isBuying || isBuyConfirming) && <Loader2 size={16} className="animate-spin" />}
              {t.ts_buy_btn} · {formatEth(totalCost, 4)} ETH
            </button>
          </div>
          {isBuySuccess && (
            <p className="text-sm font-bold" style={{ color: "#00ff88" }}>
              ✓ {ticketQty} {t.ts_bought}
            </p>
          )}
        </div>
      )}

      {/* Vote list */}
      <div className="glass-card p-5 space-y-3">
        <h2 className="font-black text-white text-lg flex items-center gap-2">
          <Zap size={20} style={{ color: "#00ff88" }} /> {t.ts_vote_title}
        </h2>
        {unusedTickets > 0 && !topScorerFinalized && (
          <div className="px-3 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "rgba(0,255,136,0.08)", color: "#00ff88", border: "1px solid rgba(0,255,136,0.2)" }}>
            ⚡ {unusedTickets} {t.ts_unused}
          </div>
        )}

        <div className="space-y-2">
          {playersWithVotes.map((player, idx) => {
            const pct    = (player.votes / maxVotes) * 100;
            const myVote = voteAmounts[player.name] || 1;
            const medal  = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "";

            return (
              <div key={player.name} className="p-3 rounded-xl space-y-2"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-3">
                  <Image src={getFlagUrl(player.flag, 80)} alt={player.country}
                    width={28} height={19} className="rounded object-cover shrink-0" unoptimized />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">
                      {medal && <span className="mr-1">{medal}</span>}{player.name}
                    </p>
                    <p className="text-xs" style={{ color: "#6b7a9a" }}>{player.country}</p>
                  </div>
                  <span className="font-mono text-sm font-bold shrink-0" style={{ color: "#00ff88" }}>
                    {player.votes.toLocaleString()}
                  </span>
                </div>

                <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: "linear-gradient(90deg,#00ff88,#7c3aed)" }} />
                </div>

                {unusedTickets > 0 && !topScorerFinalized && (
                  <div className="flex items-center gap-2">
                    <input type="number" min={1} max={unusedTickets} value={myVote}
                      onChange={e => setVoteAmounts(v => ({ ...v, [player.name]: Math.min(unusedTickets, Math.max(1, parseInt(e.target.value) || 1)) }))}
                      className="w-16 text-center text-sm font-bold rounded-lg py-1 text-white"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
                    <button
                      onClick={() => vote({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "voteTopScorer", args: [player.name, BigInt(myVote)] })}
                      disabled={isVoting}
                      className="btn-neon text-xs py-1.5 px-4 flex items-center gap-1">
                      {isVoting && <Loader2 size={11} className="animate-spin" />}
                      {t.ts_vote_btn}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
