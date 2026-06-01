"use client";

import { useAccount } from "wagmi";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { shortenAddress } from "@/lib/config";
import { Trophy, Medal } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

interface LeaderEntry { rank: number; address: string; nfts: number; votes: number; total: number; }

const MOCK: LeaderEntry[] = Array.from({ length: 50 }, (_, i) => {
  const nfts  = Math.floor(Math.random() * 25);
  const votes = Math.floor(Math.random() * 40);
  return {
    rank: i + 1,
    address: `0x${(BigInt("0xDeAdBeEf") + BigInt(i * 997)).toString(16).padStart(40, "0")}`,
    nfts,
    votes,
    total: nfts + votes,
  };
}).sort((a, b) => b.total - a.total).map((e, i) => ({ ...e, rank: i + 1 }));

function PodiumItem({ entry, pos }: { entry: LeaderEntry; pos: 1 | 2 | 3 }) {
  const cfg = {
    1: { emoji: "🥇", glow: "rgba(251,191,36,0.2)",  border: "rgba(251,191,36,0.35)",  h: "h-24" },
    2: { emoji: "🥈", glow: "rgba(156,163,175,0.15)", border: "rgba(156,163,175,0.25)", h: "h-16" },
    3: { emoji: "🥉", glow: "rgba(205,124,50,0.15)",  border: "rgba(205,124,50,0.25)",  h: "h-12" },
  }[pos];

  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      <div className="glass-card p-4 w-full text-center"
        style={{ borderColor: cfg.border, boxShadow: `0 0 30px ${cfg.glow}` }}>
        <div className="text-3xl mb-2">{cfg.emoji}</div>
        <p className="font-mono text-xs truncate" style={{ color: "#6b7a9a" }}>{shortenAddress(entry.address)}</p>
        <div className="flex items-center justify-center gap-3 mt-2">
          <span className="text-xs font-bold" style={{ color: "#00ff88" }}>🌍 {entry.nfts}</span>
          <span className="text-xs font-bold" style={{ color: "#8b5cf6" }}>⚽ {entry.votes}</span>
        </div>
      </div>
      <div className={`w-full ${cfg.h} rounded-b-2xl`}
        style={{ background: `linear-gradient(to top, ${cfg.glow}, transparent)`, border: "1px solid rgba(255,255,255,0.04)" }} />
    </div>
  );
}

export function LeaderboardPage() {
  const { address, isConnected } = useAccount();
  const { login } = useLoginWithAbstract();
  const { t }     = useLang();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-6">
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>🏆</div>
        <div className="text-center space-y-2">
          <p className="text-xl font-black text-white">{t.lb_connect_title}</p>
          <p className="text-sm" style={{ color: "#6b7a9a" }}>{t.lb_connect_desc}</p>
        </div>
        <button onClick={login} className="btn-neon px-8 py-3 text-sm font-bold">{t.connect}</button>
      </div>
    );
  }

  const userEntry = address
    ? MOCK.find(e => e.address.toLowerCase() === address.toLowerCase())
    : undefined;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-black text-white flex items-center justify-center gap-3">
          <Trophy size={30} style={{ color: "#fbbf24" }} /> {t.lb_title}
        </h1>
        <p className="text-sm" style={{ color: "#6b7a9a" }}>
          Ranked by NFTs held + votes cast
        </p>
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full text-xs font-semibold"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#6b7a9a" }}>
          <span className="flex items-center gap-1"><span style={{ color: "#00ff88" }}>🌍</span> Country NFTs</span>
          <span>·</span>
          <span className="flex items-center gap-1"><span style={{ color: "#8b5cf6" }}>⚽</span> Top Scorer Votes</span>
        </div>
      </div>

      {/* Podium */}
      <div className="flex items-end gap-3 px-6 pb-2">
        <PodiumItem entry={MOCK[1]} pos={2} />
        <PodiumItem entry={MOCK[0]} pos={1} />
        <PodiumItem entry={MOCK[2]} pos={3} />
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden" style={{ padding: 0 }}>
        <table className="w-full text-sm">
          <thead style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <tr>
              <th className="px-4 py-3 text-left font-bold text-[11px] uppercase tracking-widest" style={{ color: "#6b7a9a" }}>{t.lb_rank}</th>
              <th className="px-4 py-3 text-left font-bold text-[11px] uppercase tracking-widest" style={{ color: "#6b7a9a" }}>{t.lb_wallet}</th>
              <th className="px-4 py-3 text-right font-bold text-[11px] uppercase tracking-widest hidden sm:table-cell" style={{ color: "#00ff88" }}>🌍 NFTs</th>
              <th className="px-4 py-3 text-right font-bold text-[11px] uppercase tracking-widest hidden sm:table-cell" style={{ color: "#8b5cf6" }}>⚽ Votes</th>
              <th className="px-4 py-3 text-right font-bold text-[11px] uppercase tracking-widest" style={{ color: "#6b7a9a" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {MOCK.slice(3, 50).map(e => (
              <tr key={e.rank}
                style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                onMouseEnter={ev => (ev.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}>
                <td className="px-4 py-3 font-bold" style={{ color: "#6b7a9a" }}>#{e.rank}</td>
                <td className="px-4 py-3 font-mono text-white">{shortenAddress(e.address)}</td>
                <td className="px-4 py-3 text-right font-semibold hidden sm:table-cell" style={{ color: "#00ff88" }}>{e.nfts}</td>
                <td className="px-4 py-3 text-right font-semibold hidden sm:table-cell" style={{ color: "#8b5cf6" }}>{e.votes}</td>
                <td className="px-4 py-3 text-right font-black text-white">{e.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sticky user row */}
      {address && (
        <div className="sticky bottom-4 mx-2">
          <div className="glass-card px-5 py-3 flex items-center justify-between"
            style={{ borderColor: "rgba(0,255,136,0.25)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
            <div className="flex items-center gap-3">
              <Medal style={{ color: "#00ff88" }} size={20} />
              <div>
                <p className="text-xs" style={{ color: "#6b7a9a" }}>{t.lb_your_pos}</p>
                <p className="font-black text-white">{userEntry ? `#${userEntry.rank}` : t.lb_not_ranked}</p>
              </div>
            </div>
            {userEntry && (
              <div className="flex items-center gap-4 text-right">
                <div>
                  <p className="text-[10px] font-semibold" style={{ color: "#00ff88" }}>NFTs</p>
                  <p className="font-black text-white">{userEntry.nfts}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold" style={{ color: "#8b5cf6" }}>Votes</p>
                  <p className="font-black text-white">{userEntry.votes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
