"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from "wagmi";
import { Loader2, Minus, Plus, X, Trophy, Zap } from "lucide-react";
import { ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS, MINT_PRICE, formatEth } from "@/lib/config";
import { getFlagUrl, type Country } from "@/lib/countries";
import { useLang } from "@/lib/LanguageContext";
import { MintSuccessModal } from "./MintSuccessModal";

interface CountryMintModalProps {
  country: Country;
  isWinner?: boolean;
  isEliminated?: boolean;
  mintClosed?: boolean;
  openSeaUrl?: string;
  onClose: () => void;
}

function getNFTImage(id: number): string {
  // Temporary: Brazil has test image. Others use flag.
  // After IPFS setup, replace with: `ipfs://QmXXX/${id}.png`
  if (id === 9) return "/nft-test.jpg";
  return getFlagUrl("", 320); // fallback — overridden below
}

export function CountryMintModal({
  country, isWinner, isEliminated, mintClosed, openSeaUrl, onClose,
}: CountryMintModalProps) {
  const { address, isConnected } = useAccount();
  const { t } = useLang();
  const [amount, setAmount]       = useState(1);
  const [mintedAmt, setMintedAmt] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Click outside closes
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const { data: totalSupply } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI,
    functionName: "countryTotalSupply",
    args: [BigInt(country.id)],
    query: { refetchInterval: 5_000 },
  });

  const { data: userBalance } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI,
    functionName: "balanceOf",
    args: address ? [address, BigInt(country.id)] : undefined,
    query: { enabled: !!address, refetchInterval: 5_000 },
  });

  const { data: ethBalance } = useBalance({ address });

  const totalCost    = MINT_PRICE * BigInt(amount);
  const hasEnoughEth = !ethBalance || ethBalance.value >= totalCost;

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const isLoading = isPending || isConfirming;

  useEffect(() => {
    if (isSuccess && txHash) setShowSuccess(true);
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

  const nftImageSrc = country.id === 9
    ? "/nft-test.jpg"
    : getFlagUrl(country.flagCode, 320);

  const accentColor = isWinner ? "#fbbf24" : isEliminated ? "#ef4444" : "#00ff88";

  return (
    <>
      {showSuccess && txHash && (
        <MintSuccessModal
          country={country}
          amount={mintedAmt}
          txHash={txHash}
          onClose={() => { setShowSuccess(false); onClose(); }}
        />
      )}

      {/* Overlay */}
      <div
        ref={overlayRef}
        onClick={handleOverlayClick}
        style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "16px",
        }}
      >
        {/* Modal */}
        <div
          style={{
            position: "relative",
            display: "flex",
            width: "100%",
            maxWidth: "780px",
            maxHeight: "90vh",
            borderRadius: "20px",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 0 80px rgba(0,0,0,0.6)",
            background: "#0a0e1a",
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: "absolute", top: 14, right: 14, zIndex: 10,
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(255,255,255,0.6)",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.14)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)"; }}
          >
            <X size={15} />
          </button>

          {/* LEFT — NFT Image */}
          <div
            style={{
              position: "relative",
              width: "42%",
              minWidth: "200px",
              flexShrink: 0,
              background: "#050810",
            }}
          >
            <Image
              src={nftImageSrc}
              alt={country.name}
              fill
              className="object-cover"
              unoptimized
              style={{ opacity: isEliminated ? 0.45 : 1, filter: isEliminated ? "grayscale(0.7)" : "none" }}
            />
            {/* Gradient right edge */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 70%, #0a0e1a 100%)" }} />
            {/* Winner badge */}
            {isWinner && (
              <div style={{ position: "absolute", top: 14, left: 14 }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "4px 10px", borderRadius: "99px", fontSize: 11, fontWeight: 900,
                  background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.45)", color: "#fbbf24",
                }}>
                  🏆 {t.card_champion}
                </span>
              </div>
            )}
            {isEliminated && (
              <div style={{ position: "absolute", top: 14, left: 14 }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "4px 10px", borderRadius: "99px", fontSize: 11, fontWeight: 900,
                  background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#ef4444",
                }}>
                  ✕ {t.card_eliminated}
                </span>
              </div>
            )}
          </div>

          {/* RIGHT — Info + Mint */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "28px 24px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            {/* Country name + group */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7a9a", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Group {country.group} · {country.continent}
                </span>
              </div>
              <h2 className="font-black text-white" style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", lineHeight: 1.1 }}>
                {country.name}
              </h2>
              <p style={{ fontSize: 12, color: "#6b7a9a", marginTop: 4 }}>
                2026 FIFA World Cup NFT
              </p>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{
                padding: "12px 14px", borderRadius: 12,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <p style={{ fontSize: 10, color: "#6b7a9a", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
                  Total Minted
                </p>
                <p className="font-black font-mono text-white" style={{ fontSize: 22 }}>
                  {totalSupply !== undefined ? totalSupply.toString() : "—"}
                </p>
              </div>
              <div style={{
                padding: "12px 14px", borderRadius: 12,
                background: address ? `rgba(0,255,136,0.04)` : "rgba(255,255,255,0.03)",
                border: `1px solid ${address ? "rgba(0,255,136,0.12)" : "rgba(255,255,255,0.06)"}`,
              }}>
                <p style={{ fontSize: 10, color: "#6b7a9a", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
                  You Hold
                </p>
                <p className="font-black font-mono" style={{ fontSize: 22, color: address ? "#00ff88" : "rgba(255,255,255,0.3)" }}>
                  {address ? (userBalance !== undefined ? userBalance.toString() : "—") : "—"}
                </p>
              </div>
            </div>

            {/* Prize share hint */}
            {totalSupply !== undefined && Number(totalSupply) > 0 && userBalance && Number(userBalance) > 0 && (
              <div style={{
                padding: "10px 14px", borderRadius: 10,
                background: "rgba(251,191,36,0.04)",
                border: "1px solid rgba(251,191,36,0.15)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <Zap size={13} style={{ color: "#fbbf24", flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: "rgba(251,191,36,0.8)" }}>
                  Your share if {country.name} wins:{" "}
                  <strong style={{ color: "#fbbf24" }}>
                    {((Number(userBalance) / Number(totalSupply)) * 100).toFixed(2)}%
                  </strong>
                  {" "}of prize pool
                </p>
              </div>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

            {/* Mint section */}
            {isEliminated ? (
              <div style={{
                padding: "14px", borderRadius: 12, textAlign: "center",
                background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
              }}>
                <p style={{ color: "#ef4444", fontWeight: 800, fontSize: 14 }}>✕ {t.card_eliminated}</p>
                <p style={{ color: "rgba(239,68,68,0.6)", fontSize: 12, marginTop: 4 }}>This country has been eliminated</p>
              </div>
            ) : isWinner ? (
              <div style={{
                padding: "14px", borderRadius: 12, textAlign: "center",
                background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.25)",
              }}>
                <p style={{ color: "#fbbf24", fontWeight: 800, fontSize: 14 }}>🏆 World Cup Champion!</p>
                <p style={{ color: "rgba(251,191,36,0.6)", fontSize: 12, marginTop: 4 }}>Claim your rewards on the Nations Cup tab</p>
              </div>
            ) : mintClosed ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{
                  padding: "12px 14px", borderRadius: 12, textAlign: "center",
                  background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
                }}>
                  <p style={{ color: "#ef4444", fontWeight: 800, fontSize: 13 }}>🔒 Minting Closed</p>
                  <p style={{ color: "rgba(239,68,68,0.55)", fontSize: 11, marginTop: 3 }}>Group stage has ended</p>
                </div>
                <a
                  href={openSeaUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "12px", borderRadius: 12, textDecoration: "none",
                    background: "rgba(32,129,226,0.08)", border: "1px solid rgba(32,129,226,0.3)",
                    color: "#4fa3f7", fontWeight: 800, fontSize: 13,
                  }}
                >
                  🌊 Trade on OpenSea
                </a>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Quantity selector */}
                <div>
                  <p style={{ fontSize: 11, color: "#6b7a9a", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
                    Quantity
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                      onClick={() => setAmount(Math.max(1, amount - 1))}
                      style={{
                        width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                        color: "white", cursor: "pointer",
                      }}
                    >
                      <Minus size={14} />
                    </button>
                    <div style={{
                      flex: 1, textAlign: "center", fontFamily: "monospace",
                      fontSize: 20, fontWeight: 900, color: "white",
                    }}>
                      {amount}
                    </div>
                    <button
                      onClick={() => setAmount(amount + 1)}
                      style={{
                        width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                        color: "white", cursor: "pointer",
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Cost */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", borderRadius: 10,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <span style={{ fontSize: 12, color: "#6b7a9a", fontWeight: 600 }}>Total cost</span>
                  <span className="font-black font-mono text-white" style={{ fontSize: 16 }}>
                    {formatEth(totalCost, 4)} ETH
                  </span>
                </div>

                {/* Mint button */}
                <button
                  onClick={handleMint}
                  disabled={!isConnected || isLoading || !hasEnoughEth}
                  className="btn-neon w-full flex items-center justify-center gap-2"
                  style={{
                    padding: "14px",
                    fontSize: 14,
                    fontWeight: 900,
                    ...(!hasEnoughEth && isConnected ? {
                      opacity: 0.5, cursor: "not-allowed",
                      background: "rgba(255,60,60,0.12)",
                      border: "1px solid rgba(255,60,60,0.3)",
                      color: "#ff6060",
                    } : {}),
                  }}
                >
                  {isLoading
                    ? <><Loader2 size={15} className="animate-spin" />{isConfirming ? t.card_confirming : t.card_minting}</>
                    : isSuccess     ? t.card_minted
                    : !isConnected  ? t.card_connect
                    : !hasEnoughEth ? "Insufficient ETH"
                    : `${t.card_mint} · ${formatEth(totalCost, 4)} ETH`}
                </button>

                <p style={{ fontSize: 11, color: "rgba(107,122,154,0.6)", textAlign: "center" }}>
                  0.0022 ETH per NFT · Abstract Chain
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
