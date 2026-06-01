"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from "wagmi";
import { Loader2, Minus, Plus } from "lucide-react";
import { ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS, MINT_PRICE, formatEth } from "@/lib/config";
import { getFlagUrl, type Country } from "@/lib/countries";
import { useLang } from "@/lib/LanguageContext";
import { MintSuccessModal } from "./MintSuccessModal";

interface CountryCardProps {
  country: Country;
  isWinner?: boolean;
  isEliminated?: boolean;
  /** True after group stage ends — minting closed, OpenSea trade shown for surviving teams */
  mintClosed?: boolean;
  openSeaUrl?: string;
}

export function CountryCard({ country, isWinner, isEliminated, mintClosed, openSeaUrl }: CountryCardProps) {
  const { address, isConnected } = useAccount();
  const { t } = useLang();
  const [amount, setAmount]     = useState(1);
  const [hovered, setHovered]   = useState(false);
  const [mintedAmt, setMintedAmt] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const { data: balance } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI,
    functionName: "balanceOf",
    args: address ? [address, BigInt(country.id)] : undefined,
    query: { enabled: !!address },
  });

  const { data: ethBalance } = useBalance({ address });

  const totalCost    = MINT_PRICE * BigInt(amount);
  const hasEnoughEth = !ethBalance || ethBalance.value >= totalCost;

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const isLoading = isPending || isConfirming;

  useEffect(() => {
    if (isSuccess && txHash) setShowModal(true);
  }, [isSuccess, txHash]);

  const handleMint = () => {
    if (!isConnected) return;
    setMintedAmt(amount);
    writeContract({
      address: CONTRACT_ADDRESS, abi: ABI,
      functionName: "mintCountryNFT",
      args: [BigInt(country.id), BigInt(amount)],
      value: totalCost,
    });
  };

  return (
    <>
    {showModal && txHash && (
      <MintSuccessModal
        country={country}
        amount={mintedAmt}
        txHash={txHash}
        onClose={() => setShowModal(false)}
      />
    )}
    <div className="flag-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ opacity: isEliminated ? 0.35 : 1, filter: isEliminated ? "grayscale(0.8)" : "none" }}>

      {/* Flag */}
      <Image src={getFlagUrl(country.flagCode, 320)} alt={country.name} fill
        className="object-cover transition-transform duration-300"
        style={{ transform: hovered ? "scale(1.06)" : "scale(1)" }}
        unoptimized />

      <div className="overlay" />

      {/* Winner */}
      {isWinner && (
        <div className="absolute top-2 left-2 right-2 flex justify-center">
          <span className="text-xs font-black px-2 py-1 rounded-full"
            style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.4)", color: "#fbbf24" }}>
            {t.card_champion}
          </span>
        </div>
      )}

      {/* Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-white font-bold text-sm leading-tight truncate">{country.name}</p>

        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px]" style={{ color: "#6b7a9a" }}>Grp {country.group}</span>
        </div>

        {address && balance !== undefined && Number(balance) > 0 && (
          <p className="text-[10px] mt-0.5 font-semibold" style={{ color: "#00ff88" }}>
            {t.card_hold}: {balance.toString()} {t.card_nft}
          </p>
        )}

        {/* ── Hover action area — 3 states ── */}

        {/* State 1: Eliminated — show badge */}
        {isEliminated && (
          <div
            className="overflow-hidden transition-all duration-200"
            style={{ maxHeight: hovered ? "48px" : "0px", opacity: hovered ? 1 : 0 }}
          >
            <div className="pt-2">
              <div
                className="w-full py-2 rounded-xl text-center text-xs font-black"
                style={{ background: "rgba(255,60,60,0.1)", border: "1px solid rgba(255,60,60,0.25)", color: "#ff6060" }}
              >
                {t.card_eliminated}
              </div>
            </div>
          </div>
        )}

        {/* State 2: Mint closed but still alive — Trade on OpenSea */}
        {!isEliminated && !isWinner && mintClosed && (
          <div
            className="overflow-hidden transition-all duration-200"
            style={{ maxHeight: hovered ? "48px" : "0px", opacity: hovered ? 1 : 0 }}
          >
            <div className="pt-2">
              <a
                href={openSeaUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 rounded-xl text-center text-xs font-black flex items-center justify-center gap-1.5"
                style={{ background: "rgba(32,129,226,0.12)", border: "1px solid rgba(32,129,226,0.35)", color: "#4fa3f7", textDecoration: "none" }}
              >
                🌊 Trade on OpenSea
              </a>
            </div>
          </div>
        )}

        {/* State 3: Mint open — full mint UI */}
        {!isEliminated && !isWinner && !mintClosed && (
          <div className="overflow-hidden transition-all duration-200"
            style={{ maxHeight: hovered ? "120px" : "0px", opacity: hovered ? 1 : 0 }}>
            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-2">
                <button onClick={() => setAmount(Math.max(1, amount - 1))}
                  className="btn-ghost rounded-lg" style={{ padding: "4px 10px" }}>
                  <Minus size={12} />
                </button>
                <span className="flex-1 text-center text-white font-bold text-sm">{amount}</span>
                <button onClick={() => setAmount(amount + 1)}
                  className="btn-ghost rounded-lg" style={{ padding: "4px 10px" }}>
                  <Plus size={12} />
                </button>
              </div>
              <button onClick={handleMint}
                disabled={!isConnected || isLoading || !hasEnoughEth}
                title={!hasEnoughEth ? "Insufficient ETH balance" : undefined}
                className="btn-neon w-full text-xs py-2 flex items-center justify-center gap-1.5"
                style={!hasEnoughEth && isConnected ? { opacity: 0.5, cursor: "not-allowed", background: "rgba(255,60,60,0.12)", border: "1px solid rgba(255,60,60,0.3)", color: "#ff6060" } : undefined}>
                {isLoading
                  ? <><Loader2 size={12} className="animate-spin" />{isConfirming ? t.card_confirming : t.card_minting}</>
                  : isSuccess     ? t.card_minted
                  : !isConnected  ? t.card_connect
                  : !hasEnoughEth ? "Insufficient ETH"
                  : `${t.card_mint} · ${formatEth(totalCost, 4)} ETH`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
