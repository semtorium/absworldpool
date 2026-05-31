"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS, formatEth } from "@/lib/config";
import { COUNTRIES } from "@/lib/countries";
import { Loader2 } from "lucide-react";
import Link from "next/link";

function fmt(wei: bigint | undefined) {
  if (!wei) return "0.0000";
  return (Number(wei) / 1e18).toFixed(4);
}

// ─── Stat card ───────────────────────────────────────────────
function Stat({ label, value, sub, color = "#00ff88" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16, padding: "16px 20px",
    }}>
      <p style={{ color: "#6b7a9a", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6 }}>{label}</p>
      <p style={{ color, fontSize: 22, fontWeight: 900, fontFamily: "monospace" }}>{value}</p>
      {sub && <p style={{ color: "#6b7a9a", fontSize: 11, marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

// ─── Tx button ───────────────────────────────────────────────
function TxButton({ label, onClick, disabled, isPending, isConfirming, isSuccess }: {
  label: string; onClick: () => void; disabled?: boolean;
  isPending: boolean; isConfirming: boolean; isSuccess: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled || isPending || isConfirming}
      style={{
        background: isSuccess ? "rgba(0,255,136,0.15)" : "linear-gradient(135deg,#00ff88,#00cc6a)",
        color: isSuccess ? "#00ff88" : "#050810",
        border: isSuccess ? "1px solid rgba(0,255,136,0.3)" : "none",
        borderRadius: 12, padding: "10px 20px", fontWeight: 800, fontSize: 13,
        cursor: (disabled || isPending || isConfirming) ? "not-allowed" : "pointer",
        opacity: (disabled || isPending || isConfirming) ? 0.5 : 1,
        display: "flex", alignItems: "center", gap: 8,
        transition: "all 0.15s",
      }}>
      {(isPending || isConfirming) && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
      {isSuccess ? "✓ Done!" : (isPending ? "Confirm in wallet…" : isConfirming ? "Confirming…" : label)}
    </button>
  );
}

// ─── Main ────────────────────────────────────────────────────
export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [showWalletPicker, setShowWalletPicker] = useState(false);

  // Owner check
  const { data: ownerAddress } = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "owner" });
  const isOwner = isConnected && address && ownerAddress &&
    address.toLowerCase() === (ownerAddress as string).toLowerCase();

  // Live stats
  const { data: totalPool,    refetch: r1 } = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "totalLockedPrizePool", query: { refetchInterval: 10_000 } });
  const { data: scorerPool,   refetch: r2 } = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "topScorerPoolBalance",  query: { refetchInterval: 10_000 } });
  const { data: totalVol,     refetch: r3 } = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "totalGlobalVolumeETH",   query: { refetchInterval: 10_000 } });
  const { data: allPools               }    = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "getAllCountryPools",       query: { refetchInterval: 10_000 } });
  const { data: ncFinalized            }    = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "tournamentFinalized",      query: { refetchInterval: 10_000 } });
  const { data: tsFinalized            }    = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "topScorerFinalized",       query: { refetchInterval: 10_000 } });
  const { data: winningId              }    = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "winningCountryId",         query: { refetchInterval: 10_000 } });
  const { data: finalScorer            }    = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "finalTopScorer",           query: { refetchInterval: 10_000 } });

  // Supply for each country (batch)
  const allCountrySupplies = COUNTRIES.map(c =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "countryTotalSupply", args: [BigInt(c.id)], query: { refetchInterval: 15_000 } }).data
  );

  // Finalize Nations Cup
  const [ncWinnerId, setNcWinnerId] = useState("");
  const { writeContract: writeNC, data: ncHash, isPending: ncPending } = useWriteContract();
  const { isLoading: ncConfirming, isSuccess: ncSuccess } = useWaitForTransactionReceipt({ hash: ncHash });

  // Finalize Top Scorer
  const [tsPlayer, setTsPlayer] = useState("");
  const { writeContract: writeTS, data: tsHash, isPending: tsPending } = useWriteContract();
  const { isLoading: tsConfirming, isSuccess: tsSuccess } = useWaitForTransactionReceipt({ hash: tsHash });

  // Advance Stage
  const [advLoser, setAdvLoser]   = useState("");
  const [advWinner, setAdvWinner] = useState("");
  const { writeContract: writeAdv, data: advHash, isPending: advPending } = useWriteContract();
  const { isLoading: advConfirming, isSuccess: advSuccess } = useWaitForTransactionReceipt({ hash: advHash });

  // Countries with activity (pool > 0 or supply > 0)
  const activeCountries = COUNTRIES
    .map((c, i) => ({
      ...c,
      pool: allPools?.[c.id] ?? 0n,
      supply: allCountrySupplies[i] ?? 0n,
    }))
    .filter(c => c.pool > 0n || c.supply > 0n)
    .sort((a, b) => (b.pool > a.pool ? 1 : -1));

  // Math preview for Nations Cup finalization
  const previewId = ncWinnerId ? Number(ncWinnerId) : null;
  const previewCountry = previewId ? COUNTRIES.find(c => c.id === previewId) : null;
  const previewPool    = previewId ? (allPools?.[previewId] ?? 0n) : 0n;
  const previewSupply  = previewId ? (allCountrySupplies[COUNTRIES.findIndex(c => c.id === previewId)] ?? 0n) : 0n;
  const previewPayout  = previewSupply > 0n
    ? (Number(previewPool) * 0.95) / Number(previewSupply) / 1e18
    : 0;

  const refetchAll = () => { r1(); r2(); r3(); };

  // ── Wallet picker modal ──
  const WalletPicker = () => (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(5,8,16,0.85)", backdropFilter: "blur(12px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 20, padding: "28px", width: "100%", maxWidth: 360,
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        <p style={{ color: "#fff", fontSize: 16, fontWeight: 900, marginBottom: 4 }}>Select Wallet</p>
        {connectors
          .filter(c => c.id !== "abstract" && c.id !== "abstractGlobalWallet")
          .map(c => (
            <button key={c.id}
              onClick={() => { disconnect(); connect({ connector: c }); setShowWalletPicker(false); }}
              style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12, padding: "12px 16px", color: "#fff", fontWeight: 700,
                fontSize: 14, cursor: "pointer", textAlign: "left",
                display: "flex", alignItems: "center", gap: 10,
                transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.09)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
            >
              <span style={{ fontSize: 20 }}>
                {c.name.toLowerCase().includes("metamask") ? "🦊"
                  : c.name.toLowerCase().includes("rabby") ? "🐰"
                  : c.name.toLowerCase().includes("coinbase") ? "🔵"
                  : "🔐"}
              </span>
              {c.name}
            </button>
          ))
        }
        <button onClick={() => setShowWalletPicker(false)}
          style={{ background: "transparent", border: "none", color: "#6b7a9a", fontSize: 13, cursor: "pointer", marginTop: 4 }}>
          Cancel
        </button>
      </div>
    </div>
  );

  // ── Not connected ──
  if (!isConnected) return (
    <div style={{ background: "#050810", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {showWalletPicker && <WalletPicker />}
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 48 }}>🔒</span>
        <p style={{ color: "#fff", fontSize: 18, fontWeight: 900 }}>Admin Panel</p>
        <p style={{ color: "#6b7a9a", fontSize: 14 }}>Connect your owner wallet to continue</p>
        <button onClick={() => setShowWalletPicker(true)}
          style={{ background: "linear-gradient(135deg,#00ff88,#00cc6a)", color: "#050810", border: "none", borderRadius: 12, padding: "12px 28px", fontWeight: 800, cursor: "pointer", fontSize: 14 }}>
          Connect Wallet
        </button>
      </div>
    </div>
  );

  // ── Not owner ──
  if (isConnected && ownerAddress && !isOwner) return (
    <div style={{ background: "#050810", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {showWalletPicker && <WalletPicker />}
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 48 }}>⛔</span>
        <p style={{ color: "#fff", fontSize: 18, fontWeight: 900 }}>Access Denied</p>
        <p style={{ color: "#6b7a9a", fontSize: 13 }}>
          Connected: {address?.slice(0,6)}...{address?.slice(-4)}
        </p>
        <button onClick={() => setShowWalletPicker(true)}
          style={{ background: "linear-gradient(135deg,#00ff88,#00cc6a)", color: "#050810", border: "none", borderRadius: 12, padding: "10px 22px", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
          Switch Wallet
        </button>
        <Link href="/" style={{ color: "#6b7a9a", fontWeight: 700, textDecoration: "none", fontSize: 13 }}>← Back to site</Link>
      </div>
    </div>
  );

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10, padding: "9px 14px", color: "#fff", fontSize: 13,
    outline: "none", width: "100%",
  };

  const selectStyle: React.CSSProperties = { ...inputStyle };

  const sectionStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 20, padding: "24px",
  };

  return (
    <div style={{ background: "#050810", minHeight: "100vh", color: "#f0f4ff" }}>
      {showWalletPicker && <WalletPicker />}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px 80px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <Link href="/" style={{ color: "#6b7a9a", fontSize: 12, textDecoration: "none" }}>← Back to site</Link>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginTop: 6 }}>
              🛠️ Admin Panel
            </h1>
            <p style={{ fontSize: 12, color: "#6b7a9a", marginTop: 2 }}>
              {address?.slice(0,6)}...{address?.slice(-4)} · {CONTRACT_ADDRESS.slice(0,8)}... · Testnet
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowWalletPicker(true)}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 14px", color: "#6b7a9a", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              Switch Wallet
            </button>
            <button onClick={refetchAll}
              style={{ background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.2)", borderRadius: 10, padding: "8px 16px", color: "#00ff88", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Live Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
          <Stat label="Total Prize Pool" value={`${fmt(totalPool as bigint)} ETH`} color="#fbbf24" />
          <Stat label="Top Scorer Pool" value={`${fmt(scorerPool as bigint)} ETH`} color="#7c3aed" />
          <Stat label="Total Volume" value={`${fmt(totalVol as bigint)} ETH`} color="#00ff88" />
          <Stat label="Nations Cup" value={ncFinalized ? `✓ Finalized` : "Active"} color={ncFinalized ? "#00ff88" : "#fbbf24"}
            sub={ncFinalized ? `Winner: #${winningId}` : undefined} />
          <Stat label="Top Scorer" value={tsFinalized ? `✓ Finalized` : "Active"} color={tsFinalized ? "#00ff88" : "#fbbf24"}
            sub={tsFinalized ? `${finalScorer}` : undefined} />
        </div>

        {/* Active Countries Table */}
        <div style={{ ...sectionStyle, marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 16 }}>
            ⚽ Active Countries ({activeCountries.length})
          </h2>
          {activeCountries.length === 0 ? (
            <p style={{ color: "#6b7a9a", fontSize: 13 }}>No mints yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    {["ID", "Country", "Pool (ETH)", "NFTs Minted", "Payout/NFT if wins"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#6b7a9a", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeCountries.map(c => {
                    const payout = c.supply > 0n
                      ? (Number(c.pool) * 0.95) / Number(c.supply) / 1e18
                      : 0;
                    return (
                      <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "8px 12px", color: "#6b7a9a" }}>#{c.id}</td>
                        <td style={{ padding: "8px 12px", color: "#fff", fontWeight: 700 }}>{c.name}</td>
                        <td style={{ padding: "8px 12px", color: "#fbbf24", fontFamily: "monospace" }}>{(Number(c.pool) / 1e18).toFixed(4)}</td>
                        <td style={{ padding: "8px 12px", color: "#00ff88", fontWeight: 700 }}>{c.supply.toString()}</td>
                        <td style={{ padding: "8px 12px", color: "#b0bcd4", fontFamily: "monospace" }}>
                          {payout > 0 ? `${payout.toFixed(5)} ETH` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Finalize Nations Cup */}
        <div style={{ ...sectionStyle, marginBottom: 24, borderColor: ncFinalized ? "rgba(0,255,136,0.15)" : "rgba(251,191,36,0.15)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
            🏆 Finalize Nations Cup
          </h2>
          <p style={{ fontSize: 12, color: "#6b7a9a", marginBottom: 16 }}>
            Declare the winning country. This is irreversible — calls <code style={{ color: "#00ff88" }}>finalizeNationsCup(countryId)</code>
          </p>

          {ncFinalized ? (
            <div style={{ padding: "12px 16px", background: "rgba(0,255,136,0.06)", borderRadius: 12, border: "1px solid rgba(0,255,136,0.2)" }}>
              <p style={{ color: "#00ff88", fontWeight: 700 }}>✓ Already finalized — Winner: Country #{winningId?.toString()}</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <select value={ncWinnerId} onChange={e => setNcWinnerId(e.target.value)} style={{ ...selectStyle, maxWidth: 260 }}>
                  <option value="">— Select winning country —</option>
                  {activeCountries.map(c => (
                    <option key={c.id} value={c.id}>{c.name} (#{c.id}) — {(Number(c.pool)/1e18).toFixed(4)} ETH, {c.supply.toString()} NFTs</option>
                  ))}
                </select>
                <TxButton
                  label={`Finalize → ${previewCountry?.name ?? "..."}`}
                  disabled={!ncWinnerId}
                  onClick={() => writeNC({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "finalizeNationsCup", args: [BigInt(ncWinnerId)] })}
                  isPending={ncPending} isConfirming={ncConfirming} isSuccess={ncSuccess}
                />
              </div>

              {/* Math preview */}
              {previewCountry && previewSupply > 0n && (
                <div style={{ padding: "14px 16px", background: "rgba(251,191,36,0.05)", borderRadius: 12, border: "1px solid rgba(251,191,36,0.15)", fontSize: 13 }}>
                  <p style={{ color: "#fbbf24", fontWeight: 800, marginBottom: 8 }}>📊 Math Preview — {previewCountry.name}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div>
                      <p style={{ color: "#6b7a9a", fontSize: 11, marginBottom: 2 }}>COUNTRY POOL</p>
                      <p style={{ color: "#fff", fontWeight: 700, fontFamily: "monospace" }}>{(Number(previewPool)/1e18).toFixed(4)} ETH</p>
                    </div>
                    <div>
                      <p style={{ color: "#6b7a9a", fontSize: 11, marginBottom: 2 }}>TOTAL NFTs</p>
                      <p style={{ color: "#fff", fontWeight: 700 }}>{previewSupply.toString()}</p>
                    </div>
                    <div>
                      <p style={{ color: "#6b7a9a", fontSize: 11, marginBottom: 2 }}>PAYOUT/NFT (95%)</p>
                      <p style={{ color: "#00ff88", fontWeight: 900, fontFamily: "monospace" }}>{previewPayout.toFixed(5)} ETH</p>
                    </div>
                  </div>
                  <p style={{ color: "#6b7a9a", fontSize: 11, marginTop: 10 }}>
                    Formula: ({(Number(previewPool)/1e18).toFixed(4)} × 0.95) ÷ {previewSupply.toString()} = {previewPayout.toFixed(6)} ETH per NFT
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Finalize Top Scorer */}
        <div style={{ ...sectionStyle, marginBottom: 24, borderColor: tsFinalized ? "rgba(0,255,136,0.15)" : "rgba(124,58,237,0.2)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
            ⚽ Finalize Top Scorer
          </h2>
          <p style={{ fontSize: 12, color: "#6b7a9a", marginBottom: 16 }}>
            Declare the top scorer. Player name must exactly match what users voted for.
          </p>

          {tsFinalized ? (
            <div style={{ padding: "12px 16px", background: "rgba(0,255,136,0.06)", borderRadius: 12, border: "1px solid rgba(0,255,136,0.2)" }}>
              <p style={{ color: "#00ff88", fontWeight: 700 }}>✓ Already finalized — {finalScorer?.toString()}</p>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input
                value={tsPlayer}
                onChange={e => setTsPlayer(e.target.value)}
                placeholder="e.g. Kylian Mbappé"
                style={{ ...inputStyle, maxWidth: 260 }}
              />
              <TxButton
                label={`Finalize → ${tsPlayer || "..."}`}
                disabled={!tsPlayer.trim()}
                onClick={() => writeTS({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "finalizeTopScorer", args: [tsPlayer.trim()] })}
                isPending={tsPending} isConfirming={tsConfirming} isSuccess={tsSuccess}
              />
            </div>
          )}
        </div>

        {/* Advance Stage */}
        <div style={{ ...sectionStyle, borderColor: "rgba(124,58,237,0.15)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
            ↗️ Advance Stage (Pool Roll-Over)
          </h2>
          <p style={{ fontSize: 12, color: "#6b7a9a", marginBottom: 16 }}>
            Roll loser's pool into winner's pool. Use for bracket elimination rounds.
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <select value={advLoser} onChange={e => setAdvLoser(e.target.value)} style={{ ...selectStyle, maxWidth: 220 }}>
              <option value="">— Loser (eliminated) —</option>
              {activeCountries.map(c => <option key={c.id} value={c.id}>{c.name} (#{c.id})</option>)}
            </select>
            <select value={advWinner} onChange={e => setAdvWinner(e.target.value)} style={{ ...selectStyle, maxWidth: 220 }}>
              <option value="">— Winner (advances) —</option>
              {activeCountries.map(c => <option key={c.id} value={c.id}>{c.name} (#{c.id})</option>)}
            </select>
            <TxButton
              label="Roll Pool"
              disabled={!advLoser || !advWinner || advLoser === advWinner}
              onClick={() => writeAdv({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "advanceStage", args: [BigInt(advLoser), BigInt(advWinner)] })}
              isPending={advPending} isConfirming={advConfirming} isSuccess={advSuccess}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
