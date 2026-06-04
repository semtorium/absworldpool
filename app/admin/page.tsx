"use client";

import { useState, useEffect, useCallback } from "react";
import { createPublicClient, createWalletClient, custom, http, type Address } from "viem";
import { abstractTestnet } from "viem/chains";
import { ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/config";
import { COUNTRIES } from "@/lib/countries";
import { TOP_SCORER_PLAYERS, EXTRA_ADMIN_WALLETS } from "@/lib/config";
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
  const [chainId, setChainId]           = useState<number | null>(null);

  // Contract state
  const [totalPool,      setTotalPool]      = useState<bigint>(0n);
  const [ncPool,         setNcPool]         = useState<bigint>(0n);
  const [scorerPool,     setScorerPool]     = useState<bigint>(0n);
  const [totalVol,       setTotalVol]       = useState<bigint>(0n);
  const [allSupplies,    setAllSupplies]    = useState<bigint[]>([]);
  const [ncFinalized,    setNcFinalized]    = useState(false);
  const [tsFinalized,    setTsFinalized]    = useState(false);
  const [winningId,      setWinningId]      = useState<bigint>(0n);
  const [finalScorer,    setFinalScorer]    = useState("");
  const [isPaused,       setIsPaused]       = useState(false);
  const [isMaintenance,  setIsMaintenance]  = useState(false);
  const [elimStatus,     setElimStatus]     = useState<boolean[]>([]);
  const [loading,        setLoading]        = useState(false);

  // Elimination state — no winner assignment needed in v6
  const [elimLoserIds, setElimLoserIds] = useState<number[]>([]);

  // Tx state
  const [ncWinnerId,    setNcWinnerId]    = useState("");
  const [tsPlayer,      setTsPlayer]      = useState("");
  const [tsCustomInput, setTsCustomInput] = useState("");
  const [txPending,     setTxPending]     = useState<string | null>(null);
  const [txSuccess,     setTxSuccess]     = useState<string | null>(null);
  const [txError,       setTxError]       = useState<string | null>(null);

  // ── Fetch contract data ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tp, ncp, sp, tv, ncF, tsF, wId, fs, owner, paused, maint, elim] = await Promise.all([
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "totalLockedPrizePool" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "nationsCupPoolBalance" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "topScorerPoolBalance" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "totalGlobalVolumeETH" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "tournamentFinalized" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "topScorerFinalized" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "winningCountryId" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "finalTopScorer" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "owner" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "paused" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "maintenanceMode" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "getAllEliminationStatus" }),
      ]);

      setTotalPool(tp as bigint);
      setNcPool(ncp as bigint);
      setScorerPool(sp as bigint);
      setTotalVol(tv as bigint);
      setNcFinalized(ncF as boolean);
      setTsFinalized(tsF as boolean);
      setWinningId(wId as bigint);
      setFinalScorer(fs as string);
      setOwnerAddress((owner as string).toLowerCase() as Address);
      setIsPaused(paused as boolean);
      setIsMaintenance(maint as boolean);
      setElimStatus(Array.from(elim as unknown as boolean[]));

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
      // Read current chain
      const cid = await walletProvider.request({ method: "eth_chainId" });
      setChainId(parseInt(cid, 16));
      // Keep chainId in sync when user switches in wallet
      walletProvider.on?.("chainChanged", (hex: string) => setChainId(parseInt(hex, 16)));
    } catch (e) {
      console.error("Connect error", e);
    }
  };

  // ── Switch to Abstract Testnet if needed ──
  const ensureChain = async () => {
    const CHAIN_HEX = "0x2B74"; // 11124 decimal
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CHAIN_HEX }],
      });
    } catch (err: any) {
      // 4902 = chain not yet added in wallet
      if (err?.code === 4902 || err?.code === -32603) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: CHAIN_HEX,
            chainName: "Abstract Testnet",
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://api.testnet.abs.xyz"],
            blockExplorerUrls: ["https://explorer.testnet.abs.xyz"],
          }],
        });
      } else {
        throw err;
      }
    }
  };

  // ── Send tx ──
  const sendTx = async (fnName: string, args: unknown[], label: string) => {
    if (!provider || !address) return;
    setTxPending(label); setTxSuccess(null); setTxError(null);
    try {
      await ensureChain();
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

  // Owner veya EXTRA_ADMIN_WALLETS listesindeki cüzdanlar panele erişebilir.
  // Not: Sadece owner cüzdanı TX gönderebilir (contract onlyOwner modifier).
  const isOwner      = address && ownerAddress && address === ownerAddress;
  const isAuthorized = isOwner || (!!address && EXTRA_ADMIN_WALLETS.map(w => w.toLowerCase()).includes(address.toLowerCase()));

  // ── Active countries (has supply) ──
  const activeCountries = COUNTRIES
    .map((c, i) => ({ ...c, supply: allSupplies[i] ?? 0n }))
    .filter(c => c.supply > 0n)
    .sort((a, b) => (b.supply > a.supply ? 1 : -1));

  // ── Math preview for NC finalize ──
  const previewId      = ncWinnerId ? Number(ncWinnerId) : null;
  const previewCountry = previewId ? COUNTRIES.find(c => c.id === previewId) : null;
  const previewSupply  = previewId ? (allSupplies[COUNTRIES.findIndex(c => c.id === previewId)] ?? 0n) : 0n;
  const previewPayout  = previewSupply > 0n ? (Number(ncPool) * 0.95) / Number(previewSupply) / 1e18 : 0;

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

  // ── Not authorized ──
  if (address && ownerAddress && !isAuthorized) return (
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

        {/* Read-only warning for extra admin wallets */}
        {!isOwner && isAuthorized && (
          <div style={{ marginBottom: 20, padding: "12px 16px", background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 12 }}>
            <p style={{ color: "#fbbf24", fontWeight: 700, fontSize: 13 }}>👁️ Read-Only Mode</p>
            <p style={{ color: "#6b7a9a", fontSize: 12, marginTop: 2 }}>Bu cüzdan admin listesinde ama owner değil. Tüm verileri görebilirsin, işlem atmaya çalışırsan revert olur.</p>
          </div>
        )}

        {/* Wrong chain warning */}
        {chainId !== null && chainId !== 11124 && (
          <div style={{ marginBottom: 20, padding: "12px 16px", background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <p style={{ color: "#fbbf24", fontWeight: 700, fontSize: 13 }}>⚠️ Wrong Network — connected to chain {chainId}</p>
              <p style={{ color: "#6b7a9a", fontSize: 12, marginTop: 2 }}>Transactions will automatically switch to Abstract Testnet when you click any action button.</p>
            </div>
            <button
              onClick={async () => { try { await ensureChain(); const cid = await provider.request({ method: "eth_chainId" }); setChainId(parseInt(cid, 16)); } catch {} }}
              style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 10, padding: "8px 14px", color: "#fbbf24", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
              Switch Now
            </button>
          </div>
        )}

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
          <Stat label="Nations Cup Pool"  value={`${fmt(ncPool)} ETH`}     color="#00ff88" />
          <Stat label="Top Scorer Pool"   value={`${fmt(scorerPool)} ETH`} color="#7c3aed" />
          <Stat label="Total Volume"      value={`${fmt(totalVol)} ETH`}   color="#00ff88" />
          <Stat label="Nations Cup"       value={ncFinalized ? "✓ Finalized" : "Active"} color={ncFinalized ? "#00ff88" : "#fbbf24"} sub={ncFinalized ? `Winner: #${winningId.toString()}` : undefined} />
          <Stat label="Top Scorer"        value={tsFinalized ? "✓ Finalized" : "Active"} color={tsFinalized ? "#00ff88" : "#fbbf24"} sub={tsFinalized ? finalScorer : undefined} />
          <Stat label="Contract Status"   value={isPaused ? "⏸ PAUSED" : "▶ Running"} color={isPaused ? "#ef4444" : "#00ff88"} />
          <Stat label="Site Maintenance"  value={isMaintenance ? "🔧 ON" : "✓ OFF"} color={isMaintenance ? "#fbbf24" : "#00ff88"} />
          <Stat label="Eliminated"        value={`${elimStatus.filter(Boolean).length} / 48`} color="#6b7a9a" />
        </div>

        {/* Mint Control */}
        <div style={{ ...sectionStyle, marginBottom: 24, borderColor: isPaused ? "rgba(239,68,68,0.4)" : "rgba(0,255,136,0.3)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 4 }}>🎟️ Mint Kontrolü</h2>
          <p style={{ fontSize: 12, color: "#6b7a9a", marginBottom: 16 }}>
            Mint kapatılınca yeni NFT basılamaz. Mevcut NFT'ler trade edilmeye devam eder.
          </p>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            padding: "20px 24px", borderRadius: 14,
            background: isPaused ? "rgba(239,68,68,0.07)" : "rgba(0,255,136,0.05)",
            border: `1px solid ${isPaused ? "rgba(239,68,68,0.35)" : "rgba(0,255,136,0.25)"}`,
          }}>
            <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                background: isPaused ? "rgba(239,68,68,0.12)" : "rgba(0,255,136,0.1)",
              }}>
                {isPaused ? "🔒" : "🟢"}
              </div>
              <div>
                <p style={{ color: "#fff", fontWeight: 900, fontSize: 16 }}>
                  {isPaused ? "Mint KAPALI" : "Mint AÇIK"}
                </p>
                <p style={{ color: "#6b7a9a", fontSize: 12, marginTop: 3 }}>
                  {isPaused
                    ? "Kullanıcılar NFT mint edemiyor · Trade serbest"
                    : "Kullanıcılar serbestçe NFT mint edebilir"}
                </p>
              </div>
            </div>
            <button
              disabled={txPending === "mintToggle"}
              onClick={() => sendTx("setPaused", [!isPaused], "mintToggle")}
              style={{
                background: isPaused
                  ? "linear-gradient(135deg,#00ff88,#00cc6a)"
                  : "linear-gradient(135deg,#ef4444,#dc2626)",
                color: isPaused ? "#050810" : "#fff",
                border: "none", borderRadius: 12, padding: "12px 24px",
                fontWeight: 900, fontSize: 14, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
              }}>
              {txPending === "mintToggle" && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
              {txPending === "mintToggle" ? "Bekleniyor…" : isPaused ? "✓ Minti Aç" : "🔒 Minti Kapat"}
            </button>
          </div>
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
                    {["ID", "Country", "NFTs Minted"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#6b7a9a", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeCountries.map(c => (
                    <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "8px 12px", color: "#6b7a9a" }}>#{c.id}</td>
                      <td style={{ padding: "8px 12px", color: "#fff", fontWeight: 700 }}>{c.name}</td>
                      <td style={{ padding: "8px 12px", color: "#00ff88", fontWeight: 700 }}>{c.supply.toString()}</td>
                    </tr>
                  ))}
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
                <select value={ncWinnerId} onChange={e => setNcWinnerId(e.target.value)} style={{ ...inputStyle, maxWidth: 320, colorScheme: "dark" }}>
                  <option value="" style={{ background: "#0d1117", color: "#6b7a9a" }}>— Select winning country —</option>
                  {COUNTRIES
                    .map((c, i) => ({ ...c, supply: allSupplies[i] ?? 0n }))
                    .sort((a, b) => (b.supply > a.supply ? 1 : -1))
                    .map(c => (
                      <option key={c.id} value={c.id} style={{ background: "#0d1117", color: c.supply > 0n ? "#fff" : "#9ca3af" }}>
                        {c.supply === 0n ? "⚠️ " : ""}{c.name} (#{c.id}) — {c.supply.toString()} NFTs
                      </option>
                    ))
                  }
                </select>
                {ncWinnerId && allSupplies[COUNTRIES.findIndex(c => c.id === Number(ncWinnerId))] === 0n && (
                  <div style={{ padding: "10px 14px", background: "rgba(251,191,36,0.07)", borderRadius: 10, border: "1px solid rgba(251,191,36,0.25)", fontSize: 12, color: "#fbbf24" }}>
                    ⚠️ This country has 0 NFTs minted — nobody will be able to claim rewards.
                  </div>
                )}
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
                    <div><p style={{ color: "#6b7a9a", fontSize: 11, marginBottom: 2 }}>MAIN NC POOL</p><p style={{ color: "#fff", fontWeight: 700, fontFamily: "monospace" }}>{(Number(ncPool)/1e18).toFixed(4)} ETH</p></div>
                    <div><p style={{ color: "#6b7a9a", fontSize: 11, marginBottom: 2 }}>WINNER NFTs</p><p style={{ color: "#fff", fontWeight: 700 }}>{previewSupply.toString()}</p></div>
                    <div><p style={{ color: "#6b7a9a", fontSize: 11, marginBottom: 2 }}>PAYOUT/NFT (95%)</p><p style={{ color: "#00ff88", fontWeight: 900, fontFamily: "monospace" }}>{previewPayout.toFixed(5)} ETH</p></div>
                  </div>
                  <p style={{ color: "#6b7a9a", fontSize: 11, marginTop: 8 }}>
                    ({(Number(ncPool)/1e18).toFixed(4)} × 0.95) ÷ {previewSupply.toString()} = {previewPayout.toFixed(6)} ETH per NFT
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
                <select
                  value={tsPlayer}
                  onChange={e => { setTsPlayer(e.target.value); setTsCustomInput(""); }}
                  style={{ ...inputStyle, maxWidth: 300, colorScheme: "dark" }}
                >
                  <option value="" style={{ background: "#0d1117", color: "#6b7a9a" }}>— Select top scorer —</option>
                  {TOP_SCORER_PLAYERS.map(p => (
                    <option key={p.name} value={p.name} style={{ background: "#0d1117", color: "#fff" }}>{p.name} ({p.country})</option>
                  ))}
                  <option value="__other__" style={{ background: "#0d1117", color: "#fbbf24" }}>✏️ Other (not in list)…</option>
                </select>
              </div>

              {tsPlayer === "__other__" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input
                    value={tsCustomInput}
                    onChange={e => setTsCustomInput(e.target.value)}
                    placeholder="Enter exact player name…"
                    style={{ ...inputStyle, maxWidth: 300 }}
                  />
                  <div style={{ padding: "12px 16px", background: "rgba(251,191,36,0.06)", borderRadius: 12, border: "1px solid rgba(251,191,36,0.2)", fontSize: 12 }}>
                    <p style={{ color: "#fbbf24", fontWeight: 700, marginBottom: 4 }}>⚠️ No votes on record for this player</p>
                    <p style={{ color: "#6b7a9a" }}>Nobody voted for this player — no one will be able to claim. The top scorer pool will remain in the contract and can be recovered via <strong style={{ color: "#b0bcd4" }}>Withdraw Unclaimed Top Scorer</strong> after 30 days.</p>
                  </div>
                </div>
              )}

              {(() => {
                const finalName = tsPlayer === "__other__" ? tsCustomInput.trim() : tsPlayer;
                const knownPlayer = TOP_SCORER_PLAYERS.find(p => p.name === tsPlayer);
                if (!finalName) return null;
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {tsPlayer !== "__other__" && (
                      <div style={{ padding: "12px 16px", background: "rgba(124,58,237,0.06)", borderRadius: 12, border: "1px solid rgba(124,58,237,0.2)", fontSize: 13 }}>
                        <p style={{ color: "#a78bfa", fontWeight: 800 }}>
                          ⚽ Selected: <span style={{ color: "#fff" }}>{finalName}</span>
                          <span style={{ color: "#6b7a9a", fontWeight: 400 }}> — {knownPlayer?.country}</span>
                        </p>
                        <p style={{ color: "#6b7a9a", fontSize: 11, marginTop: 6 }}>
                          This exact string will be stored on-chain. Users who voted for "{finalName}" will be eligible to claim.
                        </p>
                      </div>
                    )}
                    <div>
                      <button
                        disabled={txPending === "finalizeTS"}
                        onClick={() => sendTx("finalizeTopScorer", [finalName], "finalizeTS")}
                        style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff", border: "none", borderRadius: 12, padding: "10px 20px", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                        {txPending === "finalizeTS" && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
                        {txPending === "finalizeTS" ? "Confirming…" : `Finalize → ${finalName}`}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Eliminate Countries */}
        <div style={{ ...sectionStyle, marginBottom: 24, borderColor: "rgba(239,68,68,0.2)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 4 }}>⛔ Eliminate Countries</h2>
          <p style={{ fontSize: 12, color: "#6b7a9a", marginBottom: 16 }}>
            Mark countries as eliminated. Funds stay in the main pool — no movement needed.<br />
            Group stage: add all 16 losers at once. Knockout: add 1 per match.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Selected losers list */}
            {elimLoserIds.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
                {elimLoserIds.map(loserId => {
                  const loser = COUNTRIES.find(c => c.id === loserId);
                  return (
                    <div key={loserId} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10 }}>
                      <span style={{ color: "#ff6060", fontWeight: 700, fontSize: 13 }}>⛔ {loser?.name ?? `#${loserId}`}</span>
                      <button
                        onClick={() => setElimLoserIds(prev => prev.filter(id => id !== loserId))}
                        style={{ background: "transparent", border: "none", color: "#6b7a9a", cursor: "pointer", fontSize: 16, padding: "0 2px", lineHeight: 1 }}
                      >✕</button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add country */}
            {!ncFinalized && (
              <select
                onChange={e => {
                  const id = Number(e.target.value);
                  if (id && !elimLoserIds.includes(id)) setElimLoserIds(prev => [...prev, id]);
                  e.target.value = "";
                }}
                style={{ ...inputStyle, maxWidth: 280, colorScheme: "dark" }}
                defaultValue=""
              >
                <option value="" style={{ background: "#0d1117", color: "#6b7a9a" }}>+ Add eliminated country…</option>
                {COUNTRIES
                  .filter(c => !elimStatus[c.id] && !elimLoserIds.includes(c.id))
                  .map(c => (
                    <option key={c.id} value={c.id} style={{ background: "#0d1117", color: "#fff" }}>
                      {c.name} (#{c.id})
                    </option>
                  ))}
              </select>
            )}

            {/* Execute */}
            {elimLoserIds.length > 0 && (
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
                <button
                  disabled={txPending === "eliminate"}
                  onClick={() => {
                    sendTx("eliminateCountries", [elimLoserIds.map(BigInt)], "eliminate")
                      .then(() => setElimLoserIds([]));
                  }}
                  style={{
                    background: "linear-gradient(135deg,#ef4444,#dc2626)",
                    color: "#fff",
                    border: "none", borderRadius: 12, padding: "10px 20px",
                    fontWeight: 800, fontSize: 13, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 8,
                  }}
                >
                  {txPending === "eliminate" && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
                  {txPending === "eliminate" ? "Confirming…" : `Eliminate ${elimLoserIds.length} ${elimLoserIds.length === 1 ? "Country" : "Countries"}`}
                </button>
                <button
                  onClick={() => setElimLoserIds([])}
                  style={{ background: "transparent", border: "none", color: "#6b7a9a", fontSize: 12, cursor: "pointer" }}
                >Clear all</button>
              </div>
            )}

            {/* Already eliminated */}
            {elimStatus.filter(Boolean).length > 0 && (
              <div style={{ marginTop: 4, padding: "12px 16px", background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ color: "#6b7a9a", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                  Already Eliminated ({elimStatus.filter(Boolean).length})
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {COUNTRIES.filter(c => elimStatus[c.id]).map(c => (
                    <span key={c.id} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "3px 10px", color: "#ff6060", fontSize: 12, fontWeight: 700 }}>
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contract Config */}
        <div style={{ ...sectionStyle, borderColor: "rgba(239,68,68,0.15)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 4 }}>⚙️ Contract Config</h2>
          <p style={{ fontSize: 12, color: "#6b7a9a", marginBottom: 20 }}>Acil durum kontrolleri. Mint açma/kapama için yukarıdaki <strong style={{ color: "#f0f4ff" }}>Mint Kontrolü</strong> bölümünü kullan.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Maintenance Mode */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 20px", borderRadius: 14, background: isMaintenance ? "rgba(251,191,36,0.07)" : "rgba(255,255,255,0.02)", border: `1px solid ${isMaintenance ? "rgba(251,191,36,0.3)" : "rgba(255,255,255,0.08)"}` }}>
              <div>
                <p style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>
                  {isMaintenance ? "🔧 Maintenance Mode ON" : "✓ Site Normal"}
                </p>
                <p style={{ color: "#6b7a9a", fontSize: 12, marginTop: 3 }}>
                  {isMaintenance ? "All visitors see the maintenance overlay." : "Site is visible to everyone normally."}
                </p>
              </div>
              <button
                disabled={txPending === "maintenance"}
                onClick={() => sendTx("setMaintenanceMode", [!isMaintenance], "maintenance")}
                style={{
                  background: isMaintenance ? "linear-gradient(135deg,#00ff88,#00cc6a)" : "linear-gradient(135deg,#fbbf24,#f59e0b)",
                  color: "#050810",
                  border: "none", borderRadius: 12, padding: "10px 20px",
                  fontWeight: 800, fontSize: 13, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
                }}>
                {txPending === "maintenance" && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
                {txPending === "maintenance" ? "Confirming…" : isMaintenance ? "Turn Off Maintenance" : "Enter Maintenance"}
              </button>
            </div>

            {/* Pause / Unpause */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 20px", borderRadius: 14, background: isPaused ? "rgba(239,68,68,0.07)" : "rgba(255,255,255,0.02)", border: `1px solid ${isPaused ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"}` }}>
              <div>
                <p style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>
                  {isPaused ? "⏸ Contract Paused" : "▶ Contract Running"}
                </p>
                <p style={{ color: "#6b7a9a", fontSize: 12, marginTop: 3 }}>
                  {isPaused ? "Mint, ticket purchase and voting are disabled." : "All user actions are enabled."}
                </p>
              </div>
              <button
                disabled={txPending === "pause"}
                onClick={() => sendTx("setPaused", [!isPaused], "pause")}
                style={{
                  background: isPaused ? "linear-gradient(135deg,#00ff88,#00cc6a)" : "linear-gradient(135deg,#ef4444,#dc2626)",
                  color: isPaused ? "#050810" : "#fff",
                  border: "none", borderRadius: 12, padding: "10px 20px",
                  fontWeight: 800, fontSize: 13, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
                }}>
                {txPending === "pause" && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
                {txPending === "pause" ? "Confirming…" : isPaused ? "Unpause Contract" : "Pause Contract"}
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
