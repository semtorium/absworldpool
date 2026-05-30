"use client";

import Image from "next/image";
import { useReadContract } from "wagmi";
import { ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS, formatEth } from "@/lib/config";
import { COUNTRIES, GROUPS, getCountriesByGroup, getFlagUrl } from "@/lib/countries";
import { useLang } from "@/lib/LanguageContext";

export function GroupsPage() {
  const { t } = useLang();

  const { data: allPools } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: "getAllCountryPools",
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center space-y-2 pb-2">
        <h1 className="text-2xl font-black text-white">{t.grp_title}</h1>
        <p className="text-sm" style={{ color: "#6b7a9a" }}>{t.grp_sub}</p>
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold" style={{ color: "#6b7a9a" }}>
          <span>{t.grp_hosts}</span>
          <span>·</span>
          <span>{t.grp_format_note}</span>
        </div>
      </div>

      {/* Groups grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {GROUPS.map((group) => {
          const teams     = getCountriesByGroup(group);
          const groupPool = teams.reduce((sum, t) => sum + (allPools?.[t.id] ?? 0n), 0n);

          return (
            <div key={group} className="glass-card p-4 space-y-3">
              {/* Group header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm"
                    style={{ background: "linear-gradient(135deg,rgba(0,255,136,0.2),rgba(124,58,237,0.2))", border: "1px solid rgba(0,255,136,0.2)", color: "#00ff88" }}>
                    {group}
                  </div>
                  <span className="font-black text-white">Group {group}</span>
                </div>
                {groupPool > 0n && (
                  <span className="text-xs font-bold font-mono" style={{ color: "#00ff88" }}>
                    {formatEth(groupPool, 4)} ETH
                  </span>
                )}
              </div>

              {/* Teams */}
              <div className="space-y-2">
                {teams.map((team) => {
                  const pool    = allPools?.[team.id] ?? 0n;
                  const hasPool = pool > 0n;

                  return (
                    <div key={team.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl transition-all"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", cursor: "default" }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(0,255,136,0.2)")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)")}>
                      <div className="relative shrink-0 overflow-hidden rounded-md" style={{ width: 36, height: 24 }}>
                        <Image src={getFlagUrl(team.flagCode, 80)} alt={team.name}
                          fill className="object-cover" unoptimized />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate leading-tight">{team.name}</p>
                        <p className="text-[10px]" style={{ color: "#6b7a9a" }}>{team.continent}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {hasPool
                          ? <span className="text-xs font-bold font-mono" style={{ color: "#00ff88" }}>{formatEth(pool, 4)}</span>
                          : <span className="text-xs" style={{ color: "#374151" }}>—</span>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>

              {groupPool > 0n && (
                <div className="h-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full" style={{ width: "100%", background: "linear-gradient(90deg,#00ff88,#7c3aed)" }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Format note */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="font-black text-white">📋 {t.grp_format}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { phase: t.grp_phase1, desc: t.grp_phase1_desc, icon: "🔵" },
            { phase: t.grp_phase2, desc: t.grp_phase2_desc, icon: "🟡" },
            { phase: t.grp_phase3, desc: t.grp_phase3_desc, icon: "🔴" },
          ].map(f => (
            <div key={f.phase} className="p-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <p className="font-bold text-white text-sm mb-1">{f.icon} {f.phase}</p>
              <p className="text-xs" style={{ color: "#6b7a9a" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
