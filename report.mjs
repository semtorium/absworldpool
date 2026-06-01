/**
 * ABS WorldPool — Community Test Report Generator
 *
 * Çalıştır: node report.mjs > test_raporu.txt
 * Gereksinim: frontend/ klasöründe çalışmalı (viem oradan gelir)
 */

import { createPublicClient, http, formatEther, parseAbiItem } from "viem";
import { abstractTestnet } from "viem/chains";

// ── Config ─────────────────────────────────────────────────────
const CONTRACT = "0x9a0894c8FCf2f858E0598ffbed955E8d864E3181";

// ID mapping must match frontend/lib/countries.ts exactly
const COUNTRIES = [
  { id:  1, name: "Mexico" },        { id:  2, name: "South Africa" },
  { id:  3, name: "South Korea" },   { id:  4, name: "Czech Republic" },
  { id:  5, name: "Canada" },        { id:  6, name: "Bosnia-Herz." },
  { id:  7, name: "Qatar" },         { id:  8, name: "Switzerland" },
  { id:  9, name: "Brazil" },        { id: 10, name: "Morocco" },
  { id: 11, name: "Haiti" },         { id: 12, name: "Scotland" },
  { id: 13, name: "United States" }, { id: 14, name: "Paraguay" },
  { id: 15, name: "Australia" },     { id: 16, name: "Turkey" },
  { id: 17, name: "Germany" },       { id: 18, name: "Curaçao" },
  { id: 19, name: "Ivory Coast" },   { id: 20, name: "Ecuador" },
  { id: 21, name: "Netherlands" },   { id: 22, name: "Japan" },
  { id: 23, name: "Sweden" },        { id: 24, name: "Tunisia" },
  { id: 25, name: "Belgium" },       { id: 26, name: "Egypt" },
  { id: 27, name: "Iran" },          { id: 28, name: "New Zealand" },
  { id: 29, name: "Spain" },         { id: 30, name: "Cape Verde" },
  { id: 31, name: "Saudi Arabia" },  { id: 32, name: "Uruguay" },
  { id: 33, name: "France" },        { id: 34, name: "Senegal" },
  { id: 35, name: "Iraq" },          { id: 36, name: "Norway" },
  { id: 37, name: "Argentina" },     { id: 38, name: "Algeria" },
  { id: 39, name: "Austria" },       { id: 40, name: "Jordan" },
  { id: 41, name: "Portugal" },      { id: 42, name: "DR Congo" },
  { id: 43, name: "Uzbekistan" },    { id: 44, name: "Colombia" },
  { id: 45, name: "England" },       { id: 46, name: "Croatia" },
  { id: 47, name: "Ghana" },         { id: 48, name: "Panama" },
];

const PLAYERS = [
  "Kylian Mbappé","Harry Kane","Lionel Messi","Erling Haaland",
  "Lamine Yamal","Mikel Oyarzabal","Cristiano Ronaldo","Vinicius Junior",
  "Lautaro Martínez","Ousmane Dembélé","Romelu Lukaku","Raphinha",
  "Julián Álvarez","Álvaro Morata","Cody Gakpo","Bukayo Saka",
  "Jude Bellingham","Florian Wirtz","Kai Havertz","Jean-Philippe Mateta",
  "Gonçalo Ramos","Nick Woltemade","Marcus Thuram","Neymar Jr",
  "Bruno Fernandes","Luis Díaz","Désiré Doué","Mohamed Salah",
  "Dani Olmo","Memphis Depay","Ferran Torres","Viktor Gyökeres",
  "Igor Thiago","Deniz Undav","Jamal Musiala","Loïs Openda",
  "Santiago Giménez","Darwin Núñez","Eberechi Eze","Matheus Cunha",
  "Alexander Sørloth","Marcus Rashford","Morgan Rogers","Nico Williams",
  "Folarin Balogun","Christian Pulisic","Jonathan David","Enner Valencia",
  "Leandro Trossard","Mikel Merino",
];

const ABI = [
  { type:"function", name:"owner",                  inputs:[],                                                    outputs:[{type:"address"}],    stateMutability:"view" },
  { type:"function", name:"devWallet",              inputs:[],                                                    outputs:[{type:"address"}],    stateMutability:"view" },
  { type:"function", name:"totalGlobalVolumeETH",   inputs:[],                                                    outputs:[{type:"uint256"}],    stateMutability:"view" },
  { type:"function", name:"totalLockedPrizePool",   inputs:[],                                                    outputs:[{type:"uint256"}],    stateMutability:"view" },
  { type:"function", name:"topScorerPoolBalance",   inputs:[],                                                    outputs:[{type:"uint256"}],    stateMutability:"view" },
  { type:"function", name:"tournamentFinalized",    inputs:[],                                                    outputs:[{type:"bool"}],       stateMutability:"view" },
  { type:"function", name:"topScorerFinalized",     inputs:[],                                                    outputs:[{type:"bool"}],       stateMutability:"view" },
  { type:"function", name:"winningCountryId",       inputs:[],                                                    outputs:[{type:"uint256"}],    stateMutability:"view" },
  { type:"function", name:"finalTopScorer",         inputs:[],                                                    outputs:[{type:"string"}],     stateMutability:"view" },
  { type:"function", name:"finalNationsCupPool",    inputs:[],                                                    outputs:[{type:"uint256"}],    stateMutability:"view" },
  { type:"function", name:"finalTopScorerPool",     inputs:[],                                                    outputs:[{type:"uint256"}],    stateMutability:"view" },
  { type:"function", name:"nationsCupFinalizedAt",  inputs:[],                                                    outputs:[{type:"uint256"}],    stateMutability:"view" },
  { type:"function", name:"topScorerFinalizedAt",   inputs:[],                                                    outputs:[{type:"uint256"}],    stateMutability:"view" },
  { type:"function", name:"getAllCountryPools",     inputs:[],                                                    outputs:[{name:"pools",type:"uint256[49]"}], stateMutability:"view" },
  { type:"function", name:"countryTotalSupply",     inputs:[{type:"uint256"}],                                    outputs:[{type:"uint256"}],    stateMutability:"view" },
  { type:"function", name:"getPlayerVotes",         inputs:[{name:"playerName",type:"string"}],                   outputs:[{type:"uint256"}],    stateMutability:"view" },
  { type:"event",    name:"CountryMinted",          inputs:[{name:"user",type:"address",indexed:true},{name:"countryId",type:"uint256",indexed:true},{name:"amount",type:"uint256"},{name:"timestamp",type:"uint256"}] },
  { type:"event",    name:"TicketPurchased",        inputs:[{name:"user",type:"address",indexed:true},{name:"quantity",type:"uint256"},{name:"timestamp",type:"uint256"}] },
  { type:"event",    name:"VoteCast",               inputs:[{name:"user",type:"address",indexed:true},{name:"playerName",type:"string"},{name:"votes",type:"uint256"},{name:"timestamp",type:"uint256"}] },
  { type:"event",    name:"PoolRolledOver",         inputs:[{name:"loserId",type:"uint256",indexed:true},{name:"winnerId",type:"uint256",indexed:true},{name:"transferredAmount",type:"uint256"}] },
  { type:"event",    name:"NationsCupFinalized",    inputs:[{name:"winningId",type:"uint256",indexed:true},{name:"totalPoolSize",type:"uint256"}] },
  { type:"event",    name:"TopScorerFinalizedEvent",inputs:[{name:"playerName",type:"string"},{name:"totalPoolSize",type:"uint256"}] },
  { type:"event",    name:"NationsCupClaimed",      inputs:[{name:"user",type:"address",indexed:true},{name:"reward",type:"uint256"},{name:"timestamp",type:"uint256"}] },
  { type:"event",    name:"TopScorerClaimed",       inputs:[{name:"user",type:"address",indexed:true},{name:"reward",type:"uint256"},{name:"timestamp",type:"uint256"}] },
  { type:"event",    name:"TransferSingle",         inputs:[{name:"operator",type:"address",indexed:true},{name:"from",type:"address",indexed:true},{name:"to",type:"address",indexed:true},{name:"id",type:"uint256"},{name:"value",type:"uint256"}] },
  { type:"event",    name:"TransferBatch",          inputs:[{name:"operator",type:"address",indexed:true},{name:"from",type:"address",indexed:true},{name:"to",type:"address",indexed:true},{name:"ids",type:"uint256[]"},{name:"values",type:"uint256[]"}] },
];

// ── Helpers ────────────────────────────────────────────────────
const client = createPublicClient({ chain: abstractTestnet, transport: http() });
const read = (fn, args = []) => client.readContract({ address: CONTRACT, abi: ABI, functionName: fn, args });
const ETH = (wei) => parseFloat(formatEther(wei)).toFixed(6);
const pct = (a, b) => b > 0n ? ((Number(a) / Number(b)) * 100).toFixed(1) : "0.0";
const line  = (char = "─", len = 62) => char.repeat(len);
const title = (s) => `\n${line("═")}\n  ${s}\n${line("═")}`;
const sec   = (s) => `\n${line()}\n  ${s}\n${line()}`;

async function getLogs(eventName, fromBlock = 0n) {
  try {
    return await client.getLogs({
      address: CONTRACT,
      event: ABI.find(x => x.type === "event" && x.name === eventName),
      fromBlock,
      toBlock: "latest",
    });
  } catch {
    // Some RPCs limit block range — fallback to recent blocks
    const latest = await client.getBlockNumber();
    const from = latest > 50000n ? latest - 50000n : 0n;
    try {
      return await client.getLogs({
        address: CONTRACT,
        event: ABI.find(x => x.type === "event" && x.name === eventName),
        fromBlock: from,
        toBlock: "latest",
      });
    } catch {
      return [];
    }
  }
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  const now = new Date().toISOString();

  // ── Fetch all state in parallel ──
  const [
    owner, devWallet,
    totalVolume, totalLocked, tsPool,
    ncFinalized, tsFinalized,
    winningId, finalScorer,
    finalNcPool, finalTsPool,
    ncFinalizedAt, tsFinalizedAt,
    allPools,
  ] = await Promise.all([
    read("owner"), read("devWallet"),
    read("totalGlobalVolumeETH"), read("totalLockedPrizePool"), read("topScorerPoolBalance"),
    read("tournamentFinalized"), read("topScorerFinalized"),
    read("winningCountryId"), read("finalTopScorer"),
    read("finalNationsCupPool"), read("finalTopScorerPool"),
    read("nationsCupFinalizedAt"), read("topScorerFinalizedAt"),
    read("getAllCountryPools"),
  ]);

  // Fetch country supplies
  const supplies = await Promise.all(COUNTRIES.map(c => read("countryTotalSupply", [BigInt(c.id)])));

  // Fetch player votes
  const playerVotes = await Promise.all(PLAYERS.map(p => read("getPlayerVotes", [p])));

  // Fetch events
  const [mintLogs, ticketLogs, voteLogs, rolloverLogs, ncFinalLogs, tsFinalLogs, ncClaimLogs, tsClaimLogs] = await Promise.all([
    getLogs("CountryMinted"),
    getLogs("TicketPurchased"),
    getLogs("VoteCast"),
    getLogs("PoolRolledOver"),
    getLogs("NationsCupFinalized"),
    getLogs("TopScorerFinalizedEvent"),
    getLogs("NationsCupClaimed"),
    getLogs("TopScorerClaimed"),
  ]);

  // ── Aggregate ──
  const totalVolEth  = BigInt(totalVolume);
  const devReceived  = (totalVolEth * 20n) / 100n; // approximate
  const totalMints   = supplies.reduce((a, b) => a + Number(b), 0);
  const uniqueMinters = new Set(mintLogs.map(l => l.args.user?.toLowerCase())).size;
  const uniqueVoters  = new Set(voteLogs.map(l => l.args.user?.toLowerCase())).size;
  const totalTickets  = ticketLogs.reduce((a, l) => a + Number(l.args.quantity ?? 0n), 0);
  const totalVotesCast = voteLogs.reduce((a, l) => a + Number(l.args.votes ?? 0n), 0);

  const activeCountries = COUNTRIES
    .map((c, i) => ({ ...c, supply: Number(supplies[i]), pool: allPools[c.id] }))
    .filter(c => c.supply > 0 || c.pool > 0n)
    .sort((a, b) => (b.pool > a.pool ? 1 : -1));

  const activePlayers = PLAYERS
    .map((name, i) => ({ name, votes: Number(playerVotes[i]) }))
    .filter(p => p.votes > 0)
    .sort((a, b) => b.votes - a.votes);

  const totalPlayerVotes = activePlayers.reduce((a, p) => a + p.votes, 0);

  const ncClaimedTotal = ncClaimLogs.reduce((a, l) => a + BigInt(l.args.reward ?? 0n), 0n);
  const tsClaimedTotal = tsClaimLogs.reduce((a, l) => a + BigInt(l.args.reward ?? 0n), 0n);

  // ── OUTPUT ──
  console.log(title("ABS WORLDPOOL — COMMUNITY TEST REPORT"));
  console.log(`  Generated : ${now}`);
  console.log(`  Contract  : ${CONTRACT}`);
  console.log(`  Network   : Abstract Testnet (Chain ID: 11124)`);
  console.log(`  Explorer  : https://explorer.testnet.abs.xyz/address/${CONTRACT}`);
  console.log(`  Owner     : ${owner}`);
  console.log(`  Dev Wallet: ${devWallet}`);

  // ── Financials ──
  console.log(sec("FINANCIALS"));
  console.log(`  Gross Volume (all mints + tickets) : ${ETH(totalVolEth)} ETH`);
  console.log(`  Dev Cut ~20% (sent instantly)      : ${ETH(devReceived)} ETH`);
  console.log(`  Total Locked in Contract           : ${ETH(BigInt(totalLocked))} ETH`);
  console.log(`    ├─ Nations Cup Pool              : ${ETH(BigInt(totalLocked) - BigInt(tsPool))} ETH`);
  console.log(`    └─ Top Scorer Pool               : ${ETH(BigInt(tsPool))} ETH`);

  // ── Nations Cup ──
  console.log(sec("NATIONS CUP"));
  if (ncFinalized) {
    const winner = COUNTRIES.find(c => c.id === Number(winningId));
    const ncAt   = new Date(Number(ncFinalizedAt) * 1000).toISOString();
    console.log(`  Status          : ✅ FINALIZED`);
    console.log(`  Winner          : ${winner?.name ?? "Unknown"} (ID: ${winningId})`);
    console.log(`  Final Pool Snap : ${ETH(BigInt(finalNcPool))} ETH`);
    console.log(`  Remaining Pool  : ${ETH(BigInt(allPools[Number(winningId)] ?? 0n))} ETH`);
    console.log(`  Claimed         : ${ETH(BigInt(finalNcPool) - BigInt(allPools[Number(winningId)] ?? 0n))} ETH`);
    console.log(`  Finalized At    : ${ncAt}`);
  } else {
    console.log(`  Status          : 🟡 Active (not yet finalized)`);
  }
  console.log(`  Total NFTs Minted     : ${totalMints}`);
  console.log(`  Active Countries      : ${activeCountries.length} / 48`);
  console.log(`  Unique Minter Wallets : ${uniqueMinters}`);
  console.log(`  NC Claims             : ${ncClaimLogs.length} wallets — ${ETH(ncClaimedTotal)} ETH paid out`);

  if (activeCountries.length > 0) {
    console.log(`\n  Country Breakdown (sorted by pool):`);
    console.log(`  ${"Country".padEnd(18)} ${"NFTs".padStart(6)}  ${"Pool (ETH)".padStart(12)}  ${"ETH/NFT if wins".padStart(16)}`);
    console.log(`  ${line("-", 58)}`);
    for (const c of activeCountries) {
      const poolEth  = Number(c.pool) / 1e18;
      const perNft   = c.supply > 0 ? (poolEth * 0.95 / c.supply) : 0;
      const isWinner = ncFinalized && c.id === Number(winningId);
      const tag      = isWinner ? " 🏆" : "";
      console.log(`  ${(c.name + tag).padEnd(20)} ${String(c.supply).padStart(4)}   ${poolEth.toFixed(6).padStart(12)}  ${perNft.toFixed(6).padStart(16)}`);
    }
  }

  if (rolloverLogs.length > 0) {
    console.log(`\n  Pool Rollovers (advanceStage calls): ${rolloverLogs.length}`);
    for (const r of rolloverLogs) {
      const loser  = COUNTRIES.find(c => c.id === Number(r.args.loserId))?.name  ?? `#${r.args.loserId}`;
      const winner = COUNTRIES.find(c => c.id === Number(r.args.winnerId))?.name ?? `#${r.args.winnerId}`;
      console.log(`    ${loser} → ${winner}  (${ETH(r.args.transferredAmount)} ETH)`);
    }
  }

  // ── Top Scorer ──
  console.log(sec("TOP SCORER"));
  if (tsFinalized) {
    const tsAt = new Date(Number(tsFinalizedAt) * 1000).toISOString();
    console.log(`  Status           : ✅ FINALIZED`);
    console.log(`  Winner           : ${finalScorer}`);
    console.log(`  Final Pool Snap  : ${ETH(BigInt(finalTsPool))} ETH`);
    console.log(`  Remaining Pool   : ${ETH(BigInt(tsPool))} ETH`);
    console.log(`  Claimed          : ${ETH(BigInt(finalTsPool) - BigInt(tsPool))} ETH`);
    console.log(`  Finalized At     : ${tsAt}`);
  } else {
    console.log(`  Status           : 🟡 Active (not yet finalized)`);
  }
  console.log(`  Total Tickets Bought : ${totalTickets}`);
  console.log(`  Total Votes Cast     : ${totalVotesCast}`);
  console.log(`  Unique Voter Wallets : ${uniqueVoters}`);
  console.log(`  TS Claims            : ${tsClaimLogs.length} wallets — ${ETH(tsClaimedTotal)} ETH paid out`);

  if (activePlayers.length > 0) {
    console.log(`\n  Player Vote Distribution (sorted by votes):`);
    console.log(`  ${"Player".padEnd(26)} ${"Votes".padStart(7)}  ${"Share %".padStart(8)}`);
    console.log(`  ${line("-", 46)}`);
    for (const p of activePlayers) {
      const share = totalPlayerVotes > 0 ? ((p.votes / totalPlayerVotes) * 100).toFixed(1) : "0.0";
      const isWinner = tsFinalized && p.name === finalScorer;
      const tag = isWinner ? " 🥇" : "";
      console.log(`  ${(p.name + tag).padEnd(28)} ${String(p.votes).padStart(5)}   ${share.padStart(7)}%`);
    }
    if (activePlayers.length < PLAYERS.length) {
      console.log(`  (${PLAYERS.length - activePlayers.length} players with 0 votes omitted)`);
    }
  } else {
    console.log(`  No votes cast yet.`);
  }

  // ── Integrity Checks ──
  console.log(sec("INTEGRITY CHECKS"));

  // Check 1: totalLockedPrizePool matches sum of pools
  const sumCountryPools = COUNTRIES.reduce((a, c) => a + BigInt(allPools[c.id] ?? 0n), 0n);
  const expectedLocked  = sumCountryPools + BigInt(tsPool);
  const lockedMatch     = expectedLocked === BigInt(totalLocked);
  console.log(`  ${lockedMatch ? "✅" : "❌"} totalLockedPrizePool matches sum of pools`);
  if (!lockedMatch) {
    console.log(`     Expected: ${ETH(expectedLocked)} ETH`);
    console.log(`     Actual  : ${ETH(BigInt(totalLocked))} ETH`);
    console.log(`     Delta   : ${ETH(BigInt(totalLocked) - expectedLocked)} ETH`);
  }

  // Check 2: volume = dev share + locked (approximately, burns complicate exact match post-claim)
  const vol80 = (totalVolEth * 80n) / 100n;
  const poolsOk = BigInt(totalLocked) <= vol80; // locked can only decrease via claims
  console.log(`  ${poolsOk ? "✅" : "❌"} Total locked ≤ 80% of gross volume (claims reduce it)`);

  // Check 3: finalization consistency
  if (ncFinalized && Number(winningId) > 0) {
    const winnerHasSupply = Number(supplies[Number(winningId) - 1]) > 0;
    console.log(`  ${winnerHasSupply ? "✅" : "❌"} Winning country has NFT supply > 0`);
  }

  // ── Raw Event Summary ──
  console.log(sec("RAW EVENT LOG SUMMARY"));
  console.log(`  CountryMinted events        : ${mintLogs.length}`);
  console.log(`  TicketPurchased events      : ${ticketLogs.length}`);
  console.log(`  VoteCast events             : ${voteLogs.length}`);
  console.log(`  PoolRolledOver events       : ${rolloverLogs.length}`);
  console.log(`  NationsCupFinalized events  : ${ncFinalLogs.length}`);
  console.log(`  TopScorerFinalized events   : ${tsFinalLogs.length}`);
  console.log(`  NationsCupClaimed events    : ${ncClaimLogs.length}`);
  console.log(`  TopScorerClaimed events     : ${tsClaimLogs.length}`);

  if (mintLogs.length > 0) {
    console.log(`\n  All CountryMinted events:`);
    console.log(`  ${"Wallet".padEnd(44)} ${"Country".padEnd(18)} ${"Qty".padStart(4)}  ${"Time (UTC)".padStart(24)}`);
    console.log(`  ${line("-", 94)}`);
    for (const l of mintLogs) {
      const country = COUNTRIES.find(c => c.id === Number(l.args.countryId))?.name ?? `#${l.args.countryId}`;
      const ts      = new Date(Number(l.args.timestamp ?? 0n) * 1000).toISOString();
      console.log(`  ${l.args.user?.padEnd(44) ?? "?"} ${country.padEnd(18)} ${String(l.args.amount ?? 0n).padStart(4)}  ${ts}`);
    }
  }

  if (voteLogs.length > 0) {
    console.log(`\n  All VoteCast events:`);
    console.log(`  ${"Wallet".padEnd(44)} ${"Player".padEnd(28)} ${"Votes".padStart(6)}  ${"Time (UTC)".padStart(24)}`);
    console.log(`  ${line("-", 106)}`);
    for (const l of voteLogs) {
      const ts = new Date(Number(l.args.timestamp ?? 0n) * 1000).toISOString();
      console.log(`  ${l.args.user?.padEnd(44) ?? "?"} ${(l.args.playerName ?? "").padEnd(28)} ${String(l.args.votes ?? 0n).padStart(6)}  ${ts}`);
    }
  }

  console.log(`\n${line("═")}`);
  console.log(`  END OF REPORT — ${now}`);
  console.log(line("═"));
}

main().catch(err => {
  console.error("Report failed:", err.message);
  process.exit(1);
});
