"use client";

import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/config";
import { useLang } from "@/lib/LanguageContext";

export function PrizeCounter() {
  const { t } = useLang();
  const { data: poolWei } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: "totalLockedPrizePool",
  });

  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (poolWei) setDisplay(Number(poolWei) / 1e18);
  }, [poolWei]);

  useEffect(() => {
    const timer = setInterval(() => {
      setDisplay(v => v + Math.random() * 0.000025);
    }, 600);
    return () => clearInterval(timer);
  }, []);

  const formatted = display.toFixed(4);
  const [int, dec] = formatted.split(".");

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-2">
        <div className="live-dot" />
        <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: "#00ff88" }}>
          {t.prize_label}
        </span>
      </div>
      <div className="flex items-baseline gap-0.5 font-mono">
        <span className="text-3xl md:text-4xl font-black text-white">{int}</span>
        <span className="text-2xl md:text-3xl font-black" style={{ color: "#00ff88" }}>.{dec}</span>
        <span className="text-base font-bold ml-1.5" style={{ color: "#6b7a9a" }}>ETH</span>
      </div>
    </div>
  );
}
