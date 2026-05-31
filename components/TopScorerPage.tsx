"use client";

import { useState } from "react";
import Image from "next/image";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Loader2, Ticket, Trophy, Zap } from "lucide-react";
import { ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS, TICKET_PRICE, TOP_SCORER_PLAYERS, formatEth } from "@/lib/config";
import { getFlagUrl } from "@/lib/countries";
import { useLang } from "@/lib/LanguageContext";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";

export function TopScorerPage() {
  const { address, isConnected } = useAccount();
  const { login } = useLoginWithAbstract();
  const { t } = useLang();
  const [ticketQty, setTicketQty]     = useState(1);
  const [voteAmounts, setVoteAmounts] = useState<Record<string, number>>({});

  const { data: ticketBalance }      = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "userUnusedTickets", args: address ? [address] : undefined, query: { enabled: !!address } });
  const { data: topScorerFinalized } = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "topScorerFinalized" });
  const { data: finalTopScorer }     = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "finalTopScorer" });

  // Global votes per player
  const playerVoteQueries = TOP_SCORER_PLAYERS.map(p =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "getPlayerVotes", args: [p.name] })
  );

  // User votes per player (to compute total purchased)
  const userVoteQueries = TOP_SCORER_PLAYERS.map(p =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useReadContract({
      address: CONTRACT_ADDRESS, abi: ABI,
      functionName: "getUserVotesForPlayer",
      args: address ? [address, p.name] : undefined,
      query: { enabled: !!address },
    })
  );

  const { writeContract: buyTickets, data: buyHash, isPending: isBuying } = useWriteContract();
  const { isLoading: isBuyConfirming, isSuccess: isBuySuccess } = useWaitForTransactionReceipt({ hash: buyHash });
  const { writeContract: vote, isPending: isVoting }             = useWriteContract();
  const { writeContract: claim, data: claimHash, isPending: isClaiming } = useWriteContract();
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({ hash: claimHash });

  const unusedTickets = Number(ticketBalance ?? 0n);
  const totalVoted    = userVoteQueries.reduce((sum, q) => sum + Number(q.data ?? 0n), 0);
  const totalPurchased = unusedTickets + totalVoted;
  const totalCost      = TICKET_PRICE * BigInt(ticketQty);

  const playersWithVotes = TOP_SCORER_PLAYERS
    .map((p, i) => ({ ...p, votes: Number(playerVoteQueries[i].data ?? 0n) }))
    .sort((a, b) => b.votes - a.votes);

  const maxVotes = Math.max(...playersWithVotes.map(p => p.votes), 1);

  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") { setTicketQty(1); return; }
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= 1) setTicketQty(num);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Ticket stats — only when connected */}
      {isConnected && (
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-4 text-center">
            <p className="text-[11px] uppercase tracking-widest font-semibold mb-2" style={{ color: "#6b7a9a" }}>
              Unused Tickets
            </p>
            <p className="text-2xl font-black text-white">{unusedTickets}</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-[11px] uppercase tracking-widest font-semibold mb-2" style={{ color: "#6b7a9a" }}>
              Total Purchased
            </p>
            <p className="text-2xl font-black text-white">
              {userVoteQueries.some(q => q.isPending) ? "—" : totalPurchased}
            </p>
          </div>
        </div>
      )}

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
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.25),rgba(0,255,136,0.15))", border: "1px solid rgba(139,92,246,0.25)" }}>
              <Ticket size={20} style={{ color: "#8b5cf6" }} />
            </div>
            <div>
              <h2 className="font-black text-white text-lg">{t.ts_buy_title}</h2>
              <p className="text-xs" style={{ color: "#6b7a9a" }}>{t.ts_buy_sub}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 p-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <button
                onClick={() => setTicketQty(q => Math.max(1, q - 1))}
                className="btn-ghost rounded-lg px-3 py-2 text-lg font-bold">−</button>
              <input
                type="number"
                min={1}
                value={ticketQty}
                onChange={handleQtyChange}
                className="flex-1 text-center font-black text-xl text-white bg-transparent border-none outline-none"
                style={{ minWidth: 0 }}
              />
              <button
                onClick={() => setTicketQty(q => q + 1)}
                className="btn-ghost rounded-lg px-3 py-2 text-lg font-bold">+</button>
            </div>

            {isConnected ? (
              <button
                onClick={() => buyTickets({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "buyScorerTickets", args: [BigInt(ticketQty)], value: totalCost })}
                disabled={isBuying || isBuyConfirming}
                className="btn-neon flex items-center gap-2 whitespace-nowrap">
                {(isBuying || isBuyConfirming) && <Loader2 size={16} className="animate-spin" />}
                {t.ts_buy_btn} · {formatEth(totalCost, 4)} ETH
              </button>
            ) : (
              <button onClick={() => login()} className="btn-neon flex items-center gap-2 whitespace-nowrap">
                Connect Wallet
              </button>
            )}
          </div>

          {isBuySuccess && (
            <p className="text-sm font-bold" style={{ color: "#00ff88" }}>
              ✓ {ticketQty} {t.ts_bought}
            </p>
          )}
        </div>
      )}

      {/* Vote section */}
      <div className="space-y-3">
        <h2 className="font-black text-white text-lg flex items-center gap-2">
          <Zap size={20} style={{ color: "#8b5cf6" }} /> {t.ts_vote_title}
        </h2>
        {unusedTickets > 0 && !topScorerFinalized && (
          <div className="px-3 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "rgba(139,92,246,0.08)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.2)" }}>
            ⚡ {unusedTickets} {t.ts_unused}
          </div>
        )}

        {/* Player grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {playersWithVotes.map((player) => {
            const pct    = (player.votes / maxVotes) * 100;
            const myVote = voteAmounts[player.name] ?? 1;
            const canVote = unusedTickets > 0 && !topScorerFinalized;
            const isWinner = topScorerFinalized && finalTopScorer === player.name;

            return (
              <div
                key={player.name}
                className="rounded-2xl overflow-hidden flex flex-col"
                style={{
                  background: isWinner ? "rgba(251,191,36,0.08)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${isWinner ? "rgba(251,191,36,0.35)" : "rgba(255,255,255,0.06)"}`,
                }}
              >
                {/* Flag */}
                <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                  <Image
                    src={getFlagUrl(player.flag, 160)} alt={player.country}
                    fill className="object-cover" unoptimized
                  />
                  {isWinner && (
                    <div className="absolute top-1.5 right-1.5 text-base leading-none">🏆</div>
                  )}
                </div>

                {/* Info */}
                <div className="p-2.5 flex flex-col gap-1.5 flex-1">
                  <p className="font-bold text-white text-xs leading-tight line-clamp-2">{player.name}</p>
                  <p className="text-[10px] leading-tight" style={{ color: "#6b7a9a" }}>{player.country}</p>

                  {/* Vote bar */}
                  <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: isWinner ? "linear-gradient(90deg,#fbbf24,#f59e0b)" : "linear-gradient(90deg,#8b5cf6,#00ff88)" }} />
                  </div>
                  <p className="font-mono text-[10px] font-bold" style={{ color: isWinner ? "#fbbf24" : "#8b5cf6" }}>
                    {player.votes.toLocaleString()} votes
                  </p>

                  {/* Vote input */}
                  {canVote && (
                    <div className="flex items-center gap-1 mt-auto pt-1">
                      <button
                        onClick={() => setVoteAmounts(v => ({ ...v, [player.name]: Math.max(1, (v[player.name] ?? 1) - 1) }))}
                        className="w-6 h-6 rounded-md font-bold text-sm flex items-center justify-center shrink-0"
                        style={{ background: "rgba(255,255,255,0.05)", color: "#6b7a9a" }}>−</button>
                      <input
                        type="number" min={1} max={unusedTickets} value={myVote}
                        onChange={e => {
                          const v = parseInt(e.target.value, 10);
                          if (!isNaN(v) && v >= 1 && v <= unusedTickets)
                            setVoteAmounts(prev => ({ ...prev, [player.name]: v }));
                        }}
                        className="flex-1 text-center text-xs font-bold rounded-md py-1 text-white"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", minWidth: 0 }}
                      />
                      <button
                        onClick={() => setVoteAmounts(v => ({ ...v, [player.name]: Math.min(unusedTickets, (v[player.name] ?? 1) + 1) }))}
                        className="w-6 h-6 rounded-md font-bold text-sm flex items-center justify-center shrink-0"
                        style={{ background: "rgba(255,255,255,0.05)", color: "#6b7a9a" }}>+</button>
                      <button
                        onClick={() => vote({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "voteTopScorer", args: [player.name, BigInt(myVote)] })}
                        disabled={isVoting}
                        className="btn-neon text-[10px] py-1 px-2 flex items-center gap-0.5 shrink-0">
                        {isVoting && <Loader2 size={9} className="animate-spin" />}
                        {t.ts_vote_btn}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
