"use client";

import { useReadContract } from "wagmi";
import { ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/config";
import { useLang } from "@/lib/LanguageContext";

export function PrizeCounter() {
  const { t } = useLang();

  // totalLockedPrizePool already includes both nations cup + top scorer pools,
  // net of the 20% dev share. No need to add topScorerPoolBalance separately.
  const { data: poolWei } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "totalLockedPrizePool",
    query: { refetchInterval: 30_000 },
  });

  const total = poolWei ?? 0n;

  const eth = (Number(total) / 1e18).toFixed(4);
  const [int, dec] = eth.split(".");

  return (
    <div
      className="prize-hero-wrap"
      style={{
        position: "relative",
        padding: "36px 16px 28px",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      {/* Background glows */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 120% at 50% 0%, rgba(251,191,36,0.10) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 50% 80% at 50% 100%, rgba(0,255,136,0.05) 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />

      {/* Animated ring */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(480px, 90vw)",
          height: "min(480px, 90vw)",
          borderRadius: "50%",
          border: "1px solid rgba(251,191,36,0.06)",
          animation: "prizeRingPulse 4s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Live label */}
        <div
          className="inline-flex items-center gap-2 mb-4"
          style={{
            background: "rgba(251,191,36,0.08)",
            border: "1px solid rgba(251,191,36,0.2)",
            borderRadius: "99px",
            padding: "4px 14px",
          }}
        >
          <div className="live-dot" />
          <span
            className="text-[10px] font-black tracking-[0.25em] uppercase"
            style={{ color: "#fbbf24" }}
          >
            {t.prize_label}
          </span>
        </div>

        {/* Big number */}
        <div
          className="flex items-baseline justify-center"
          style={{ gap: "2px", lineHeight: 1 }}
        >
          <span
            className="font-black font-mono"
            style={{
              fontSize: "clamp(3.5rem, 12vw, 7.5rem)",
              color: "#fff",
              textShadow: "0 0 60px rgba(251,191,36,0.25), 0 0 120px rgba(251,191,36,0.10)",
              letterSpacing: "-0.03em",
            }}
          >
            {int}
          </span>
          <span
            className="font-black font-mono"
            style={{
              fontSize: "clamp(3rem, 10vw, 6.5rem)",
              color: "#fbbf24",
              textShadow: "0 0 40px rgba(251,191,36,0.5)",
              letterSpacing: "-0.03em",
            }}
          >
            .{dec}
          </span>
          <span
            className="font-black"
            style={{
              fontSize: "clamp(1.2rem, 4vw, 2.5rem)",
              color: "rgba(251,191,36,0.6)",
              marginLeft: "8px",
              letterSpacing: "0.05em",
            }}
          >
            ETH
          </span>
        </div>

        {/* Subtitle */}
        <p
          className="mt-3 text-sm font-semibold"
          style={{ color: "rgba(107,122,154,0.9)" }}
        >
          Grows with every mint · Claim when your nation wins
        </p>

        {/* Stats strip */}
        <div
          className="inline-flex items-center gap-0 mt-5 overflow-hidden"
          style={{
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "14px",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          {[
            { emoji: "⚽", label: "48 Nations" },
            { emoji: "🌍", label: "3 Host Countries" },
            { emoji: "🏆", label: "2026 World Cup" },
          ].map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold"
              style={{
                color: "#6b7a9a",
                borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}
            >
              <span>{s.emoji}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
