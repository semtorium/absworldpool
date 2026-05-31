"use client";

import { useState, useEffect, useCallback } from "react";
import { createPublicClient, createWalletClient, custom, http, type Address } from "viem";
import { abstractTestnet } from "viem/chains";
import { ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/config";
import { COUNTRIES } from "@/lib/countries";
import { TOP_SCORER_PLAYERS } from "@/lib/config";
import { Loader2 } from "lucide-react";
import Link from "next/link";

// ── Viem clients ──────────────────────────────────────────────
const publicClient = createPublicClient({
  chain: abstractTestnet,
  transport: http(),
});

function fmt(wei: bigint | undefined) {
  if (!wei === undefined || wei === undefined) return "0.0000";
  return (Number(wei) / 1e18).toFixed(4);
}

// ── EIP-6963 wallet discovery ─────────────────────────────────
interface EIP6963ProviderInfo { uuid: string; name: string; icon: string; rdns: string; }
interface EIP6963ProviderDetail { info: EIP6963ProviderInfo; provider: any; }

function useWalletDiscovery() {
  const [wallets, setWallets] = useState<EIP6963ProviderDetail[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<EIP6963ProviderDetail>).detail;
      setWallets(prev =>
        prev.find(w => w.info.uuid === detail.info.uuid) ? prev : [...prev, detail]
      );
    };
    window.addEventListener("eip6963:announceProvider", handler as EventListener);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () => window.removeEventListener("eip6963:announceProvider", handler as EventListener);
  }, []);

  return wallets;
}

// ── Stat card ─────────────────────────────────────────────────
function Stat({ label, value, sub, color = "#00ff88" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "16px 20px" }}>
      <p style={{ color: "#6b7a9a", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6 }}>{label}</p>
      <p style={{ color, fontSize: 22, fontWeight: 900, fontFamily: "monospace" }}>{value}</p>
      {sub && <p style={{ color: "#6b7a9a", fontSize: 11, marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function AdminPage() {
  const discoveredWallets = useWalletDiscovery();

  const [address, setAddress]           = useState<Address | null>(null);
  const [provider, setProvider]         = useState<any>(null);
  const [showPicker, setShowPicker]     = useState(false);
  const [ownerAddress, setOwnerAddress] = useState<Address | null>(null);

  // Contract state
  const [totalPool,   setTotalPool]   = useState<bigint>(0n);
  const [scorerPool,  setScorerPool]  = useState<bigint>(0n);
  const [totalVol,    setTotalVol]    = useState<bigint>(0n);
  const [allPools,    setAllPools]    = useState<bigint[]>([]);
  const [allSupplies, setAllSupplies] = useState<bigint[]>([]);
  const [ncFinalized, setNcFinalized] = useState(false);
  const [tsFinalized, setTsFinalized] = useState(false);
  const [winningId,   setWinningId]   = useState<bigint>(0n);
  const [finalScorer, setFinalScorer] = useState("");
  const [loading,     setLoading]     = useState(false);

  // Tx state
  const [ncWinnerId, setNcWinnerId] = useState("");
  const [tsPlayer,   setTsPlayer]   = useState("");
  const [advLoser,   setAdvLoser]   = useState("");
  const [advWinner,  setAdvWinner]  = useState("");
  const [txPending,  setTxPending]  = useState<string | null>(null);
  const [txSuccess,  setTxSuccess]  = useState<string | null>(null);
  const [txError,    setTxError]    = useState<string | null>(null);

  // ── Fetch contract data ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tp, sp, tv, ap, ncF, tsF, wId, fs, owner] = await Promise.all([
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "totalLockedPrizePool" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "topScorerPoolBalance" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "totalGlobalVolumeETH" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "getAllCountryPools" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "tournamentFinalized" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "topScorerFinalized" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "winningCountryId" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "finalTopScorer" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "owner" }),
      ]);

      setTotalPool(tp as bigint);
      setScorerPool(sp as bigint);
      setTotalVol(tv as bigint);
      setAllPools(Array.from(ap as unknown as bigint[]));
      setNcFinalized(ncF as boolean);
      setTsFinalized(tsF as boolean);
      setWinningId(wId as bigint);
      setFinalScorer(fs as string);
      setOwnerAddress((owner as string).toLowerCase() as Address);

      // Fetch supplies for active countries
      const supplies = await Promise.all(
        COUNTRIES.map(c =>
          publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "countryTotalSupply", args: [BigInt(c.id)] })
        )
      );
      setAllSupplies(supplies as bigint[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Connect wallet via EIP-6963 ──
  const connectWallet = async (walletProvider: any) => {
    try {
      const accounts = await walletProvider.request({ method: "eth_requestAccounts" });
      setAddress(accounts[0].toLowerCase() as Address);
      setProvider(walletProvider);
      setShowPicker(false);
    } catch (e) {
      console.error("Connect error", e);
    }
  };

  // ── Send tx ──
  const sendTx = async (fnName: string, args: unknown[], label: string) => {
    if (!provider || !address) return;
    setTxPending(label); setTxSuccess(null); setTxError(null);
    try {
      const walletClient = createWalletClient({ account: address, chain: abstractTestnet, transport: custom(provider) });
      const hash = await walletClient.writeContract({ address: CONTRACT_ADDRESS, abi: ABI as any, functionName: fnName, args });
      await publicClient.waitForTransactionReceipt({ hash });
      setTxSuccess(label);
      await fetchData();
    } catch (e: any) {
      setTxError(e?.shortMessage ?? e?.message ?? "Transaction failed");
    } finally {
      setTxPending(null);
    }
  };

  const isOwner = address && ownerAddress && address === ownerAddress;

  // ── Active countries ──
  const activeCountries = COUNTRIES
    .map((c, i) => ({ ...c, pool: allPools[c.id] ?? 0n, supply: allSupplies[i] ?? 0n }))
    .filter(c => c.pool > 0n || c.supply > 0n)
    .sort((a, b) => (b.pool > a.pool ? 1 : -1));

  // ── Math preview ──
  const previewId      = ncWinnerId ? Number(ncWinnerId) : null;
  const previewCountry = previewId ? COUNTRIES.find(c => c.id === previewId) : null;
  const previewPool    = previewId ? (allPools[previewId] ?? 0n) : 0n;
  const previewSupply  = previewId ? (allSupplies[COUNTRIES.findIndex(c => c.id === previewId)] ?? 0n) : 0n;
  const previewPayout  = previewSupply > 0n ? (Number(previewPool) * 0.95) / Number(previewSupply) / 1e18 : 0;

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10, padding: "9px 14px", color: "#fff", fontSize: 13, outline: "none", width: "100%",
  };
  const sectionStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "24px",
  };

  // ── Wallet Picker ──
  const WalletPicker = () => (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(5,8,16,0.88)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "28px", width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ color: "#fff", fontSize: 16, fontWeight: 900, marginBottom: 6 }}>Select Wallet</p>

        {discoveredWallets.length === 0 && (
          <p style={{ color: "#6b7a9a", fontSize: 13 }}>No wallets detected. Install MetaMask or Rabby.</p>
        )}

        {discoveredWallets.map(w => (
          <button key={w.info.uuid} onClick={() => connectWallet(w.provider)}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 16px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12, transition: "background 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.09)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
          >
            {w.info.icon
              ? <img src={w.info.icon} width={24} height={24} style={{ borderRadius: 6 }} alt={w.info.name} />
              : <span style={{ fontSize: 20 }}>🔐</span>
            }
            {w.info.name}
          </button>
        ))}

        <button onClick={() => setShowPicker(false)} style={{ background: "transparent", border: "none", color: "#6b7a9a", fontSize: 13, cursor: "pointer", marginTop: 4 }}>
          Cancel
        </button>
      </div>
    </div>
  );

  // ── Not connected ──
  if (!address) return (
    <div style={{ background: "#050810", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {showPicker && <WalletPicker />}
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 48 }}>🔒</span>
        <p style={{ color: "#fff", fontSize: 18, fontWeight: 900 }}>Admin Panel</p>
        <p style={{ color: "#6b7a9a", fontSize: 14 }}>Connect your owner wallet</p>
        <button onClick={() => setShowPicker(true)}
          style={{ background: "linear-gradient(135deg,#00ff88,#00cc6a)", color: "#050810", border: "none", borderRadius: 12, padding: "12px 28px", fontWeight: 800, cursor: "pointer", fontSize: 14 }}>
          Connect Wallet
        </button>
      </div>
    </div>
  );

  // ── Not owner ──
  if (address && ownerAddress && !isOwner) return (
    <div style={{ background: "#050810", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {showPicker && <WalletPicker />}
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 48 }}>⛔</span>
        <p style={{ color: "#fff", fontSize: 18, fontWeight: 900 }}>Access Denied</p>
        <p style={{ color: "#6b7a9a", fontSize: 13 }}>Connected: {address.slice(0,6)}...{address.slice(-4)}</p>
        <button onClick={() => { setAddress(null); setProvider(null); setShowPicker(true); }}
          style={{ background: "linear-gradient(135deg,#00ff88,#00cc6a)", color: "#050810", border: "none", borderRadius: 12, padding: "10px 22px", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
          Switch Wallet
        </button>
        <Link href="/" style={{ color: "#6b7a9a", fontWeight: 700, textDecoration: "none", fontSize: 13 }}>← Back to site</Link>
      </div>
    </div>
  );

  // ── Admin Panel ──
  return (
    <div style={{ background: "#050810", minHeight: "100vh", color: "#f0f4ff" }}>
      {showPicker && <WalletPicker />}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px 80px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <Link href="/" style={{ color: "#6b7a9a", fontSize: 12, textDecoration: "none" }}>← Back to site</Link>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginTop: 6 }}>🛠️ Admin Panel</h1>
            <p style={{ fontSize: 12, color: "#6b7a9a", marginTop: 2 }}>
              {address?.slice(0,6)}...{address?.slice(-4)} · Testnet
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setAddress(null); setProvider(null); setShowPicker(true); }}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 14px", color: "#6b7a9a", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              Switch Wallet
            </button>
            <button onClick={fetchData} disabled={loading}
              style={{ background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.2)", borderRadius: 10, padding: "8px 16px", color: "#00ff88", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              {loading ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : "↻"} Refresh
            </button>
          </div>
        </div>

        {/* Tx feedback */}
        {txSuccess && (
          <div style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.25)", borderRadius: 12, color: "#00ff88", fontWeight: 700, fontSize: 13 }}>
            ✓ {txSuccess} — transaction confirmed!
          </div>
        )}
        {txError && (
          <div style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.25)", borderRadius: 12, color: "#ff6060", fontSize: 13 }}>
            ✗ {txError}
          </div>
        )}

        {/* Live Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
          <Stat label="Total Prize Pool"  value={`${fmt(totalPool)} ETH`}  color="#fbbf24" />
          <Stat label="Top Scorer Pool"   value={`${fmt(scorerPool)} ETH`} color="#7c3aed" />
          <Stat label="Total Volume"      value={`${fmt(totalVol)} ETH`}   color="#00ff88" />
          <Stat label="Nations Cup"       value={ncFinalized ? "✓ Finalized" : "Active"} color={ncFinalized ? "#00ff88" : "#fbbf24"} sub={ncFinalized ? `Winner: #${winningId.toString()}` : undefined} />
          <Stat label="Top Scorer"        value={tsFinalized ? "✓ Finalized" : "Active"} color={tsFinalized ? "#00ff88" : "#fbbf24"} sub={tsFinalized ? finalScorer : undefined} />
        </div>

        {/* Active Countries */}
        <div style={{ ...sectionStyle, marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 16 }}>⚽ Active Countries ({activeCountries.length})</h2>
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
                    const payout = c.supply > 0n ? (Number(c.pool) * 0.95) / Number(c.supply) / 1e18 : 0;
                    return (
                      <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "8px 12px", color: "#6b7a9a" }}>#{c.id}</td>
                        <td style={{ padding: "8px 12px", color: "#fff", fontWeight: 700 }}>{c.name}</td>
                        <td style={{ padding: "8px 12px", color: "#fbbf24", fontFamily: "monospace" }}>{(Number(c.pool)/1e18).toFixed(4)}</td>
                        <td style={{ padding: "8px 12px", color: "#00ff88", fontWeight: 700 }}>{c.supply.toString()}</td>
                        <td style={{ padding: "8px 12px", color: "#b0bcd4", fontFamily: "monospace" }}>{payout > 0 ? `${payout.toFixed(5)} ETH` : "—"}</td>
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
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 4 }}>🏆 Finalize Nations Cup</h2>
          <p style={{ fontSize: 12, color: "#6b7a9a", marginBottom: 16 }}>Declare the winning country — irreversible.</p>
          {ncFinalized ? (
            <div style={{ padding: "12px 16px", background: "rgba(0,255,136,0.06)", borderRadius: 12, border: "1px solid rgba(0,255,136,0.2)" }}>
              <p style={{ color: "#00ff88", fontWeight: 700 }}>✓ Finalized — Winner: Country #{winningId.toString()}</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <select value={ncWinnerId} onChange={e => setNcWinnerId(e.target.value)} style={{ ...inputStyle, maxWidth: 280 }}>
                  <option value="">— Select winning country —</option>
                  {activeCountries.map(c => (
                    <option key={c.id} value={c.id}>{c.name} (#{c.id}) — {(Number(c.pool)/1e18).toFixed(4)} ETH, {c.supply.toString()} NFTs</option>
                  ))}
                </select>
                <button
                  disabled={!ncWinnerId || txPending === "finalizeNC"}
                  onClick={() => sendTx("finalizeNationsCup", [BigInt(ncWinnerId)], "finalizeNC")}
                  style={{ background: !ncWinnerId ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#00ff88,#00cc6a)", color: !ncWinnerId ? "#4a5568" : "#050810", border: "none", borderRadius: 12, padding: "10px 20px", fontWeight: 800, fontSize: 13, cursor: !ncWinnerId ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                  {txPending === "finalizeNC" && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
                  {txPending === "finalizeNC" ? "Confirming…" : `Finalize → ${previewCountry?.name ?? "..."}`}
                </button>
              </div>
              {previewCountry && previewSupply > 0n && (
                <div style={{ padding: "14px 16px", background: "rgba(251,191,36,0.05)", borderRadius: 12, border: "1px solid rgba(251,191,36,0.15)", fontSize: 13 }}>
                  <p style={{ color: "#fbbf24", fontWeight: 800, marginBottom: 8 }}>📊 Math Preview — {previewCountry.name}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div><p style={{ color: "#6b7a9a", fontSize: 11, marginBottom: 2 }}>POOL</p><p style={{ color: "#fff", fontWeight: 700, fontFamily: "monospace" }}>{(Number(previewPool)/1e18).toFixed(4)} ETH</p></div>
                    <div><p style={{ color: "#6b7a9a", fontSize: 11, marginBottom: 2 }}>TOTAL NFTs</p><p style={{ color: "#fff", fontWeight: 700 }}>{previewSupply.toString()}</p></div>
                    <div><p style={{ color: "#6b7a9a", fontSize: 11, marginBottom: 2 }}>PAYOUT/NFT (95%)</p><p style={{ color: "#00ff88", fontWeight: 900, fontFamily: "monospace" }}>{previewPayout.toFixed(5)} ETH</p></div>
                  </div>
                  <p style={{ color: "#6b7a9a", fontSize: 11, marginTop: 8 }}>
                    ({(Number(previewPool)/1e18).toFixed(4)} × 0.95) ÷ {previewSupply.toString()} = {previewPayout.toFixed(6)} ETH per NFT
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Finalize Top Scorer */}
        <div style={{ ...sectionStyle, marginBottom: 24, borderColor: tsFinalized ? "rgba(0,255,136,0.15)" : "rgba(124,58,237,0.2)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 4 }}>⚽ Finalize Top Scorer</h2>
          <p style={{ fontSize: 12, color: "#6b7a9a", marginBottom: 16 }}>Player name must exactly match what users voted for.</p>
          {tsFinalized ? (
            <div style={{ padding: "12px 16px", background: "rgba(0,255,136,0.06)", borderRadius: 12, border: "1px solid rgba(0,255,136,0.2)" }}>
              <p style={{ color: "#00ff88", fontWeight: 700 }}>✓ Finalized — {finalScorer}</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <select value={tsPlayer} onChange={e => setTsPlayer(e.target.value)} style={{ ...inputStyle, maxWidth: 300 }}>
                  <option value="">— Select top scorer —</option>
                  {TOP_SCORER_PLAYERS.map(p => (
                    <option key={p.name} value={p.name}>{p.name} ({p.country})</option>
                  ))}
                </select>
                <button
                  disabled={!tsPlayer || txPending === "finalizeTS"}
                  onClick={() => sendTx("finalizeTopScorer", [tsPlayer], "finalizeTS")}
                  style={{ background: !tsPlayer ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#7c3aed,#6d28d9)", color: !tsPlayer ? "#4a5568" : "#fff", border: "none", borderRadius: 12, padding: "10px 20px", fontWeight: 800, fontSize: 13, cursor: !tsPlayer ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                  {txPending === "finalizeTS" && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
                  {txPending === "finalizeTS" ? "Confirming…" : `Finalize → ${tsPlayer || "..."}`}
                </button>
              </div>
              {tsPlayer && (
                <div style={{ padding: "12px 16px", background: "rgba(124,58,237,0.06)", borderRadius: 12, border: "1px solid rgba(124,58,237,0.2)", fontSize: 13 }}>
                  <p style={{ color: "#a78bfa", fontWeight: 800 }}>
                    ⚽ Selected: <span style={{ color: "#fff" }}>{tsPlayer}</span>
                    <span style={{ color: "#6b7a9a", fontWeight: 400 }}> — {TOP_SCORER_PLAYERS.find(p => p.name === tsPlayer)?.country}</span>
                  </p>
                  <p style={{ color: "#6b7a9a", fontSize: 11, marginTop: 6 }}>
                    This exact string will be stored on-chain. Users who voted for "{tsPlayer}" will be eligible to claim.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Advance Stage */}
        <div style={{ ...sectionStyle, borderColor: "rgba(124,58,237,0.15)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 4 }}>↗️ Advance Stage (Pool Roll-Over)</h2>
          <p style={{ fontSize: 12, color: "#6b7a9a", marginBottom: 16 }}>Roll loser's pool into winner's pool after a match.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <select value={advLoser} onChange={e => setAdvLoser(e.target.value)} style={{ ...inputStyle, maxWidth: 220 }}>
              <option value="">— Loser (eliminated) —</option>
              {activeCountries.map(c => <option key={c.id} value={c.id}>{c.name} (#{c.id})</option>)}
            </select>
            <select value={advWinner} onChange={e => setAdvWinner(e.target.value)} style={{ ...inputStyle, maxWidth: 220 }}>
              <option value="">— Winner (advances) —</option>
              {activeCountries.map(c => <option key={c.id} value={c.id}>{c.name} (#{c.id})</option>)}
            </select>
            <button
              disabled={!advLoser || !advWinner || advLoser === advWinner || txPending === "advance"}
              onClick={() => sendTx("advanceStage", [BigInt(advLoser), BigInt(advWinner)], "advance")}
              style={{ background: (!advLoser || !advWinner || advLoser === advWinner) ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#f59e0b,#d97706)", color: (!advLoser || !advWinner || advLoser === advWinner) ? "#4a5568" : "#050810", border: "none", borderRadius: 12, padding: "10px 20px", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              {txPending === "advance" && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
              {txPending === "advance" ? "Confirming…" : "Roll Pool"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
