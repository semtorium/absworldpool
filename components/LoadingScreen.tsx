"use client";

import { useEffect, useState } from "react";

interface Props {
  onDone: () => void;
  isReady: boolean;
}

export function LoadingScreen({ onDone, isReady }: Props) {
  const [phase, setPhase] = useState<"in" | "wait" | "out">("in");

  useEffect(() => {
    // minimum 1.8s so the animation is visible
    const minTimer = setTimeout(() => {
      if (isReady) setPhase("out");
      else setPhase("wait");
    }, 1800);
    return () => clearTimeout(minTimer);
  }, []);

  useEffect(() => {
    if (isReady && phase === "wait") setPhase("out");
  }, [isReady, phase]);

  useEffect(() => {
    if (phase === "out") {
      const t = setTimeout(onDone, 600);
      return () => clearTimeout(t);
    }
  }, [phase, onDone]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#050810",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        opacity: phase === "out" ? 0 : 1,
        transition: "opacity 0.6s ease",
        pointerEvents: phase === "out" ? "none" : "all",
      }}
    >
      {/* Background gradient blobs */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 70% 50% at 30% 20%, rgba(124,58,237,0.14) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 70% 80%, rgba(0,255,136,0.08) 0%, transparent 55%)",
      }} />

      {/* Field lines decoration */}
      <div style={{
        position: "absolute",
        bottom: "12%",
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(320px, 80vw)",
        height: "80px",
        borderBottom: "2px solid rgba(255,255,255,0.06)",
        borderLeft: "2px solid rgba(255,255,255,0.06)",
        borderRight: "2px solid rgba(255,255,255,0.06)",
        borderRadius: "0 0 60px 60px",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute",
        bottom: "calc(12% + 80px)",
        left: "50%",
        transform: "translateX(-50%)",
        width: "60px",
        height: "60px",
        borderRadius: "50%",
        border: "2px solid rgba(255,255,255,0.06)",
        pointerEvents: "none",
      }} />

      {/* Bounce container */}
      <div style={{ position: "relative", marginBottom: "48px" }}>
        {/* Football SVG */}
        <div style={{ animation: "ballBounce 0.75s cubic-bezier(0.33,0,0.66,1) infinite alternate" }}>
          <svg width="88" height="88" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Outer circle */}
            <circle cx="44" cy="44" r="42" fill="#f0f0f0" stroke="#1a1a1a" strokeWidth="2.5"/>

            {/* Classic football pentagon pattern */}
            {/* Center pentagon */}
            <polygon points="44,22 55,31 51,44 37,44 33,31" fill="#1a1a1a"/>
            {/* Top-left */}
            <polygon points="22,28 33,31 30,44 16,40 15,27" fill="#1a1a1a"/>
            {/* Top-right */}
            <polygon points="66,28 73,40 58,44 55,31 62,24" fill="#1a1a1a"/>
            {/* Bottom */}
            <polygon points="44,66 37,44 51,44 57,56 44,66" fill="#1a1a1a"/>
            {/* Bottom-left */}
            <polygon points="26,62 20,48 30,44 37,56 30,66" fill="#1a1a1a"/>
            {/* Bottom-right */}
            <polygon points="62,62 58,44 68,40 74,52 62,68" fill="#1a1a1a"/>

            {/* Shine */}
            <ellipse cx="33" cy="28" rx="8" ry="5" fill="rgba(255,255,255,0.35)" transform="rotate(-25 33 28)"/>
          </svg>
        </div>

        {/* Shadow */}
        <div style={{
          position: "absolute",
          bottom: "-16px",
          left: "50%",
          transform: "translateX(-50%)",
          animation: "shadowPulse 0.75s cubic-bezier(0.33,0,0.66,1) infinite alternate",
          width: "60px",
          height: "10px",
          borderRadius: "50%",
          background: "rgba(0,0,0,0.5)",
          filter: "blur(6px)",
        }} />
      </div>

      {/* Brand */}
      <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
        <p style={{
          fontSize: "11px",
          fontWeight: 900,
          letterSpacing: "0.35em",
          textTransform: "uppercase",
          color: "#fbbf24",
          marginBottom: "6px",
        }}>
          ABS WorldPool
        </p>
        <p style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "rgba(107,122,154,0.9)",
          letterSpacing: "0.05em",
        }}>
          2026 FIFA World Cup
        </p>

        {/* Pulsing dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "20px" }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: "6px", height: "6px",
              borderRadius: "50%",
              background: "#00ff88",
              animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes ballBounce {
          0%   { transform: translateY(0px) scaleY(1) scaleX(1); }
          85%  { transform: translateY(-70px) scaleY(1.05) scaleX(0.97); }
          100% { transform: translateY(-80px) scaleY(1.08) scaleX(0.94); }
        }
        @keyframes shadowPulse {
          0%   { transform: translateX(-50%) scale(1);    opacity: 0.5; }
          100% { transform: translateX(-50%) scale(0.35); opacity: 0.15; }
        }
        @keyframes dotPulse {
          0%, 80%, 100% { transform: scale(1);   opacity: 0.35; }
          40%            { transform: scale(1.5); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
