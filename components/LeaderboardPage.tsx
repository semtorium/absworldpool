"use client";

import { useAccount } from "wagmi";
import { shortenAddress } from "@/lib/config";
import { Trophy, Medal } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

interface LeaderEntry { rank: number; address: string; mints: number; votes: number; points: number; }

const MOCK: LeaderEntry[] = Array.from({ length: 50 }, (_, i) => {
  const mints = Math.floor(Math.random() * 30);
  const votes = Math.floor(Math.random() * 20);
  return { rank: i + 1, address: `0x${(BigInt("0xDeAdBeEf") + BigInt(i * 999)).toString(16).padStart(40, "0")}`, mints, votes, points: mints * 10 + votes * 5 };
}).sort((a, b) => b.points - a.points).map((e, i) => ({ ...e, rank: i + 1 }));

function PodiumItem({ entry, pos }: { entry: LeaderEntry; pos: 1 | 2 | 3 }) {
  const cfg = {
    1: { emoji: "🥇", glow: "rgba(251,191,36,0.2)", border: "rgba(251,191,36,0.35)", h: "h-24" },
    2: { emoji: "🥈", glow: "rgba(156,163,175,0.15)", border: "rgba(156,163,175,0.25)", h: "h-16" },
    3: { emoji: "🥉", glow: "rgba(205,124,50,0.15)", border: "rgba(205,124,50,0.25)", h: "h-12" },
  }[pos];

  const { t } = useLang();

  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      <div className="glass-card p-4 w-full text-center"
        style={{ borderColor: cfg.border, boxShadow: `0 0 30px ${cfg.glow}` }}>
        <div className="text-3xl mb-2">{cfg.emoji}</div>
        <p className="font-mono text-xs truncate" style={{ color: "#6b7a9a" }}>{shortenAddress(entry.address)}</p>
        <p className="font-black text-xl text-white mt-1">{entry.points}</p>
        <p className="text-[10px]" style={{ color: "#6b7a9a" }}>{t.lb_pts}</p>
      </div>
      <div className={`w-full ${cfg.h} rounded-b-2xl`}
        style={{ background: `linear-gradient(to top, ${cfg.glow}, transparent)`, border: `1px solid rgba(255,255,255,0.04)` }} />
    </div>
  );
}

export function LeaderboardPage() {
  const { address } = useAccount();
  const { t }       = useLang();
  const userEntry   = address ? MOCK.find(e => e.address.toLowerCase() === address.toLowerCase()) : undefined;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-black text-white flex items-center justify-center gap-3">
          <Trophy size={30} style={{ color: "#fbbf24" }} /> {t.lb_title}
        </h1>
        <p className="text-sm" style={{ color: "#6b7a9a" }}>{t.lb_formula}</p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: "rgba(251,191,36,0.08)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)" }}>
          {t.lb_live_note}
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
              {[t.lb_rank, t.lb_wallet, t.lb_mints, t.lb_votes, t.lb_points].map((h, i) => (
                <th key={h} className={`px-4 py-3 font-bold text-[11px] uppercase tracking-widest ${i >= 2 ? "text-right hidden sm:table-cell" : "text-left"} ${i === 4 ? "!table-cell" : ""}`}
                  style={{ color: "#6b7a9a" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK.slice(3, 50).map(e => (
              <tr key={e.rank} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                onMouseEnter={ev => (ev.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}>
                <td className="px-4 py-3 font-bold" style={{ color: "#6b7a9a" }}>#{e.rank}</td>
                <td className="px-4 py-3 font-mono text-white">{shortenAddress(e.address)}</td>
                <td className="px-4 py-3 text-right hidden sm:table-cell" style={{ color: "#6b7a9a" }}>{e.mints}</td>
                <td className="px-4 py-3 text-right hidden sm:table-cell" style={{ color: "#6b7a9a" }}>{e.votes}</td>
                <td className="px-4 py-3 text-right font-black" style={{ color: "#00ff88" }}>{e.points}</td>
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
              <div className="text-right">
                <p className="font-black text-lg" style={{ color: "#00ff88" }}>{userEntry.points} {t.lb_pts}</p>
                <p className="text-xs" style={{ color: "#6b7a9a" }}>{userEntry.mints} {t.lb_mints} · {userEntry.votes} {t.lb_votes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
