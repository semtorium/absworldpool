"use client";

import { useEffect, useRef, useState } from "react";
import { usePublicClient } from "wagmi";
import { parseAbiItem } from "viem";
import { CONTRACT_ADDRESS, shortenAddress } from "@/lib/config";

interface HolderEntry {
  address: string;
  displayName: string;
  totalNfts: number;
}

const RANK_EMOJIS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

async function resolveAbstractUsername(address: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.abs.xyz/v1/usernames/reverse/${address.toLowerCase()}`,
      { signal: AbortSignal.timeout(2000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.username as string) || null;
  } catch {
    return null;
  }
}

export function HoldersTicker() {
  const client = usePublicClient();
  const [holders, setHolders] = useState<HolderEntry[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!client) return;

    async function fetchHolders() {
      try {
        const logs = await (client as NonNullable<typeof client>).getLogs({
          address: CONTRACT_ADDRESS,
          event: parseAbiItem(
            "event CountryMinted(address indexed user, uint256 indexed countryId, uint256 amount, uint256 timestamp)"
          ),
          fromBlock: 0n,
          toBlock: "latest",
        });

        const totals: Record<string, bigint> = {};
        for (const log of logs) {
          const user = log.args.user as string;
          const amount = log.args.amount as bigint;
          totals[user] = (totals[user] ?? 0n) + amount;
        }

        const sorted = Object.entries(totals)
          .sort(([, a], [, b]) => Number(b - a))
          .slice(0, 10);

        if (sorted.length === 0) return;

        const entries = await Promise.all(
          sorted.map(async ([address, total]) => {
            const username = await resolveAbstractUsername(address);
            return {
              address,
              displayName: username ?? shortenAddress(address),
              totalNfts: Number(total),
            };
          })
        );

        setHolders(entries);
      } catch {
        // silent fail — ticker just stays hidden
      }
    }

    fetchHolders();
    const id = setInterval(fetchHolders, 60_000);
    return () => clearInterval(id);
  }, [client]);

  if (holders.length === 0) return null;

  const items = [...holders, ...holders]; // duplicate for seamless loop
  const duration = Math.max(20, holders.length * 4);

  return (
    <div
      className="ticker-outer"
      style={{
        background: "rgba(0,255,136,0.04)",
        borderBottom: "1px solid rgba(0,255,136,0.12)",
        overflow: "hidden",
        height: "34px",
        display: "flex",
        alignItems: "center",
        position: "relative",
        zIndex: 50,
      }}
    >
      {/* Left label */}
      <div
        className="shrink-0 flex items-center gap-1.5 px-3 text-[10px] font-black tracking-widest uppercase"
        style={{
          color: "#00ff88",
          background: "rgba(5,8,16,0.95)",
          height: "100%",
          borderRight: "1px solid rgba(0,255,136,0.15)",
          zIndex: 2,
          whiteSpace: "nowrap",
        }}
      >
        <span className="live-dot" style={{ width: 6, height: 6 }} />
        TOP HOLDERS
      </div>

      {/* Scrolling area — must overflow its container */}
      <div style={{ flex: 1, overflow: "hidden", height: "100%" }}>
      <div
        ref={trackRef}
        style={{
          display: "inline-flex",
          alignItems: "center",
          height: "100%",
          animation: `tickerScroll ${duration}s linear infinite`,
          whiteSpace: "nowrap",
          willChange: "transform",
        }}
        onMouseEnter={() => {
          if (trackRef.current) trackRef.current.style.animationPlayState = "paused";
        }}
        onMouseLeave={() => {
          if (trackRef.current) trackRef.current.style.animationPlayState = "running";
        }}
      >
        {items.map((h, i) => {
          const rank = i % holders.length;
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1.5"
              style={{ padding: "0 20px", fontSize: "11px" }}
            >
              <span style={{ fontSize: "13px" }}>{RANK_EMOJIS[rank]}</span>
              <span className="font-bold" style={{ color: "#f0f4ff" }}>
                {h.displayName}
              </span>
              <span
                className="font-black font-mono"
                style={{ color: "#00ff88" }}
              >
                {h.totalNfts} NFT
              </span>
              <span style={{ color: "rgba(255,255,255,0.1)", margin: "0 4px" }}>
                ·
              </span>
            </span>
          );
        })}
      </div>
      </div>  {/* scrolling area */}
    </div>
  );
}
