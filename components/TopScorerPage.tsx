"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();

  const [ticketQty, setTicketQty]     = useState(1);
  const [voteAmounts, setVoteAmounts] = useState<Record<string, number>>({});

  const { data: ticketBalance, refetch: refetchTickets } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI,
    functionName: "userUnusedTickets",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 5_000 },
  });

  const { data: topScorerFinalized } = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "topScorerFinalized" });
  const { data: finalTopScorer }     = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "finalTopScorer" });

  // Global votes per player — 5s refresh for live vote bar
  const playerVoteQueries = TOP_SCORER_PLAYERS.map(p =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useReadContract({
      address: CONTRACT_ADDRESS, abi: ABI,
      functionName: "getPlayerVotes",
      args: [p.name],
      query: { refetchInterval: 5_000 },
    })
  );

  const { writeContract: buyTickets, data: buyHash, isPending: isBuying } = useWriteContract();
  const { isLoading: isBuyConfirming, isSuccess: isBuySuccess } = useWaitForTransactionReceipt({ hash: buyHash });
  const { writeContract: vote, data: voteHash, isPending: isVoting }             = useWriteContract();
  const { isLoading: isVoteConfirming, isSuccess: isVoteSuccess } = useWaitForTransactionReceipt({ hash: voteHash });
  const { writeContract: claim, data: claimHash, isPending: isClaiming } = useWriteContract();
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({ hash: claimHash });

  // Immediately refetch after any successful tx
  useEffect(() => {
    if (isBuySuccess || isVoteSuccess) {
      refetchTickets();
      queryClient.invalidateQueries();
    }
  }, [isBuySuccess, isVoteSuccess, refetchTickets, queryClient]);

  const { data: ethBalance } = useBalance({ address, query: { refetchInterval: 5_000 } });

  const unusedTickets  = Number(ticketBalance ?? 0n);
  const totalCost      = TICKET_PRICE * BigInt(ticketQty);
  const hasEnoughEth   = !ethBalance || ethBalance.value >= totalCost;

  const playersWithVotes = TOP_SCORER_PLAYERS
    .map((p, i) => ({ ...p, votes: Number(playerVoteQueries[i].data ?? 0n) }))
    .sort((a, b) => b.votes - a.votes);

  const maxVotes = Math.max(...playersWithVotes.map(p => p.votes), 1);

  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseInt(e.target.value, 10);
    if (!isNaN(num) && num >= 1) setTicketQty(num);
    else if (e.target.value === "") setTicketQty(1);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Claim banner */}
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
          <button
            onClick={() => claim({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "claimTopScorerRewards", args: [] })}
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
            {/* Unused tickets counter — right side */}
            {isConnected && unusedTickets > 0 && (
              <div className="ml-auto shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
                <span className="text-xs font-semibold" style={{ color: "#6b7a9a" }}>Unused</span>
                <span className="font-black text-lg text-white">{unusedTickets}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 p-2 rounded-xl"
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
                disabled={isBuying || isBuyConfirming || !hasEnoughEth}
                title={!hasEnoughEth ? "Insufficient ETH balance" : undefined}
                className="btn-neon flex items-center justify-center gap-2 w-full sm:w-auto"
                style={!hasEnoughEth ? { opacity: 0.45, cursor: "not-allowed", background: "rgba(255,60,60,0.15)", border: "1px solid rgba(255,60,60,0.3)", color: "#ff6060" } : undefined}>
                {(isBuying || isBuyConfirming) && <Loader2 size={16} className="animate-spin" />}
                {!hasEnoughEth ? "Insufficient ETH" : `${t.ts_buy_btn} · ${formatEth(totalCost, 4)} ETH`}
              </button>
            ) : (
              <button onClick={() => login()} className="btn-neon w-full sm:w-auto flex items-center justify-center">
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

      {/* Unused tickets alert — animated */}
      {isConnected && unusedTickets > 0 && !topScorerFinalized && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm"
          style={{
            background: "rgba(251,191,36,0.07)",
            border: "1px solid rgba(251,191,36,0.3)",
            color: "#fbbf24",
            animation: "ticketAlertPulse 2.5s ease-in-out infinite",
          }}>
          {/* Sonar ping dot */}
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: "#fbbf24" }} />
            <span className="relative inline-flex rounded-full h-3 w-3"
              style={{ background: "#fbbf24" }} />
          </span>
          <span>
            You have <strong className="text-white">{unusedTickets}</strong> unused ticket{unusedTickets !== 1 ? "s" : ""}! Vote for a player below.
          </span>
        </div>
      )}

      {/* Vote list */}
      <div className="glass-card p-5 space-y-3">
        <h2 className="font-black text-white text-lg flex items-center gap-2">
          <Zap size={20} style={{ color: "#8b5cf6" }} /> {t.ts_vote_title}
        </h2>

        <div className="space-y-2">
          {playersWithVotes.map((player) => {
            const pct      = (player.votes / maxVotes) * 100;
            const myVote   = voteAmounts[player.name] ?? 1;
            const canVote  = unusedTickets > 0 && !topScorerFinalized && isConnected;
            const isWinner = topScorerFinalized && finalTopScorer === player.name;

            return (
              <div key={player.name}
                className="p-3 rounded-xl space-y-2"
                style={{
                  background: isWinner ? "rgba(251,191,36,0.06)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${isWinner ? "rgba(251,191,36,0.3)" : "rgba(255,255,255,0.05)"}`,
                }}>

                <div className="flex items-center gap-3">
                  {/* Small flag */}
                  <Image
                    src={getFlagUrl(player.flag, 80)} alt={player.country}
                    width={28} height={19}
                    className="rounded object-cover shrink-0" unoptimized
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">
                      {isWinner && <span className="mr-1">🏆</span>}
                      {player.name}
                    </p>
                    <p className="text-xs" style={{ color: "#6b7a9a" }}>{player.country}</p>
                  </div>
                  <span className="font-mono text-sm font-bold shrink-0"
                    style={{ color: isWinner ? "#fbbf24" : "#8b5cf6" }}>
                    {player.votes.toLocaleString()}
                  </span>
                </div>

                {/* Vote bar */}
                <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: isWinner
                        ? "linear-gradient(90deg,#fbbf24,#f59e0b)"
                        : "linear-gradient(90deg,#8b5cf6,#00ff88)",
                    }} />
                </div>

                {/* Vote input */}
                {canVote && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={1} max={unusedTickets} value={myVote}
                      onChange={e => {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v) && v >= 1 && v <= unusedTickets)
                          setVoteAmounts(prev => ({ ...prev, [player.name]: v }));
                      }}
                      className="w-16 text-center text-sm font-bold rounded-lg py-1 text-white"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                    <button
                      onClick={() => vote({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "voteTopScorer", args: [player.name, BigInt(myVote)] })}
                      disabled={isVoting || isVoteConfirming}
                      className="btn-neon text-xs py-1.5 px-4 flex items-center gap-1">
                      {(isVoting || isVoteConfirming) && <Loader2 size={11} className="animate-spin" />}
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
