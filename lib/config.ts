import { abstractTestnet } from "viem/chains";

// ── Sözleşme Adresi ───────────────────────────────────────────
// Mainnet deploy sonrası bu adresi güncelle
export const CONTRACT_ADDRESS = "0x57B4722d8b97DE1F254f6d2F65f4c594a850b4c7" as `0x${string}`;

// ── Ağ ────────────────────────────────────────────────────────
export const CHAIN = abstractTestnet;

// ── Fiyatlar (wei) ────────────────────────────────────────────
export const MINT_PRICE   = BigInt("2200000000000000"); // 0.0022 ETH
export const TICKET_PRICE = BigInt("1800000000000000"); // 0.0018 ETH

// ── Limitler ──────────────────────────────────────────────────
export const MAX_MINT_PER_WALLET = 10;

// ── Gol Kralı Adayları ────────────────────────────────────────
// Turnuva öncesi güncelle
export const TOP_SCORER_PLAYERS = [
  { name: "Kylian Mbappe",    country: "France",       flag: "fr" },
  { name: "Erling Haaland",   country: "Norway",       flag: "no" },
  { name: "Vinicius Jr",      country: "Brazil",       flag: "br" },
  { name: "Harry Kane",       country: "England",      flag: "gb-eng" },
  { name: "Lamine Yamal",     country: "Spain",        flag: "es" },
  { name: "Pedri",            country: "Spain",        flag: "es" },
  { name: "Bukayo Saka",      country: "England",      flag: "gb-eng" },
  { name: "Rodri",            country: "Spain",        flag: "es" },
  { name: "Jude Bellingham",  country: "England",      flag: "gb-eng" },
  { name: "Florian Wirtz",    country: "Germany",      flag: "de" },
  { name: "Jamal Musiala",    country: "Germany",      flag: "de" },
  { name: "Raphinha",         country: "Brazil",       flag: "br" },
  { name: "Phil Foden",       country: "England",      flag: "gb-eng" },
  { name: "Gavi",             country: "Spain",        flag: "es" },
  { name: "Antoine Griezmann",country: "France",       flag: "fr" },
  { name: "Ousmane Dembele",  country: "France",       flag: "fr" },
];

// ── Yardımcı ──────────────────────────────────────────────────
export function formatEth(wei: bigint, decimals = 4): string {
  const eth = Number(wei) / 1e18;
  return eth.toFixed(decimals);
}

export function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
