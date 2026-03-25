import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther, type Address } from "viem";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./config/contract";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const STATE_NAMES = ["Open", "Active", "Resolved", "Disputed", "Cancelled", "Expired"] as const;

const stateColors: Record<string, { bg: string; text: string; border: string }> = {
  Open: { bg: "rgba(16,185,129,0.15)", text: "#34d399", border: "rgba(16,185,129,0.3)" },
  Active: { bg: "rgba(245,158,11,0.15)", text: "#fbbf24", border: "rgba(245,158,11,0.3)" },
  Resolved: { bg: "rgba(99,102,241,0.15)", text: "#a5b4fc", border: "rgba(99,102,241,0.3)" },
  Disputed: { bg: "rgba(239,68,68,0.15)", text: "#fca5a5", border: "rgba(239,68,68,0.3)" },
  Cancelled: { bg: "rgba(107,114,128,0.15)", text: "#9ca3af", border: "rgba(107,114,128,0.3)" },
  Expired: { bg: "rgba(107,114,128,0.15)", text: "#9ca3af", border: "rgba(107,114,128,0.3)" },
};

function Badge({ state }: { state: string }) {
  const c = stateColors[state] || stateColors.Cancelled;
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>
      {state === "Active" && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: c.text, marginRight: 5, animation: "pulse 2s infinite" }} />}
      {state}
    </span>
  );
}

function shortAddr(addr: string) {
  if (!addr || addr === ZERO_ADDRESS) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function timeAgo(timestamp: bigint) {
  const seconds = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 12, padding: "18px 20px", flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 11, color: "#8b8974", textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "#d4af37", fontFamily: "'Courier Prime', monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#6b6b5a", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

interface GameData {
  id: number;
  player1: Address;
  player2: Address;
  wagerAmount: bigint;
  createdAt: bigint;
  resolvedAt: bigint;
  state: number;
  winner: Address;
  gameType: string;
}

function GameRow({ gameId, onClick }: { gameId: number; onClick: (g: GameData) => void }) {
  const { data } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getGame",
    args: [BigInt(gameId)],
  });

  if (!data) return null;
  const game: GameData = {
    id: gameId,
    player1: (data as any).player1 ?? (data as any)[0],
    player2: (data as any).player2 ?? (data as any)[1],
    wagerAmount: (data as any).wagerAmount ?? (data as any)[2],
    createdAt: (data as any).createdAt ?? (data as any)[3],
    resolvedAt: (data as any).resolvedAt ?? (data as any)[4],
    state: Number((data as any).state ?? (data as any)[5]),
    winner: (data as any).winner ?? (data as any)[6],
    gameType: (data as any).gameType ?? (data as any)[7],
  };
  const stateName = STATE_NAMES[game.state] || "Unknown";

  return (
    <div
      onClick={() => onClick(game)}
      style={{ display: "grid", gridTemplateColumns: "60px 1fr 100px 100px 100px 120px", padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "center", cursor: "pointer", transition: "background 0.2s" }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(212,175,55,0.04)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      <span style={{ fontFamily: "'Courier Prime', monospace", color: "#6b6b5a", fontSize: 13 }}>#{game.id}</span>
      <div>
        <span style={{ fontFamily: "'Courier Prime', monospace", fontSize: 13 }}>{shortAddr(game.player1)}</span>
        {game.player2 !== ZERO_ADDRESS && <span style={{ color: "#6b6b5a", margin: "0 6px", fontSize: 12 }}>vs</span>}
        {game.player2 !== ZERO_ADDRESS && <span style={{ fontFamily: "'Courier Prime', monospace", fontSize: 13 }}>{shortAddr(game.player2)}</span>}
        {game.player2 === ZERO_ADDRESS && <span style={{ color: "#34d399", fontSize: 11, marginLeft: 8, fontWeight: 600 }}>Waiting...</span>}
      </div>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{game.gameType}</span>
      <span style={{ fontFamily: "'Courier Prime', monospace", fontSize: 14, fontWeight: 700, color: "#d4af37" }}>{formatEther(game.wagerAmount)} Ξ</span>
      <Badge state={stateName} />
      <div style={{ textAlign: "right", fontSize: 11, color: "#6b6b5a" }}>{timeAgo(game.createdAt)}</div>
    </div>
  );
}

function CreateGamePanel({ onSuccess }: { onSuccess: () => void }) {
  const [gameType, setGameType] = useState("Spades");
  const [wager, setWager] = useState("0.001");
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  if (isSuccess) {
    onSuccess();
  }

  return (
    <div style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 14, padding: 24, marginBottom: 24, animation: "slideUp 0.3s ease" }}>
      <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, color: "#d4af37" }}>New Game</h3>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label style={{ display: "block", fontSize: 11, color: "#8b8974", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6, fontWeight: 600 }}>Game Type</label>
          <div style={{ display: "flex", gap: 6 }}>
            {["Spades", "Tonk", "Blackjack"].map(g => (
              <button key={g} onClick={() => setGameType(g)} style={{ background: gameType === g ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.04)", border: gameType === g ? "1px solid rgba(212,175,55,0.5)" : "1px solid rgba(255,255,255,0.08)", color: gameType === g ? "#d4af37" : "#8b8974", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.2s" }}>
                {g}
              </button>
            ))}
          </div>
        </div>
        <div style={{ minWidth: 160 }}>
          <label style={{ display: "block", fontSize: 11, color: "#8b8974", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6, fontWeight: 600 }}>Wager (ETH)</label>
          <input type="number" step="0.001" min="0.001" max="10" value={wager} onChange={e => setWager(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#e8e4d9", padding: "8px 14px", borderRadius: 8, fontSize: 16, fontFamily: "'Courier Prime', monospace", fontWeight: 700, outline: "none" }} />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button
            disabled={isPending || isConfirming}
            onClick={() => writeContract({
              address: CONTRACT_ADDRESS,
              abi: CONTRACT_ABI,
              functionName: "createGame",
              args: [gameType],
              value: parseEther(wager),
            })}
            style={{ background: isPending || isConfirming ? "#8b8974" : "#d4af37", color: "#0a0a0f", border: "none", padding: "10px 28px", borderRadius: 8, cursor: isPending || isConfirming ? "wait" : "pointer", fontWeight: 700, fontSize: 14, transition: "all 0.2s" }}
          >
            {isPending ? "Confirm in Wallet..." : isConfirming ? "Confirming..." : "Deposit & Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GameDetailModal({ game, onClose }: { game: GameData; onClose: () => void }) {
  const { address } = useAccount();
  const stateName = STATE_NAMES[game.state] || "Unknown";
  const { data: feeBps } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "platformFeeBps",
  });
  const pot = game.wagerAmount * 2n;
  const fee = (pot * (feeBps ?? 500n)) / 10000n;
  const payout = pot - fee;
  const { writeContract, isPending } = useWriteContract();

  const isCreator = address?.toLowerCase() === game.player1.toLowerCase();
  const isPlayer = isCreator || address?.toLowerCase() === game.player2.toLowerCase();
  const canJoin = game.state === 0 && address && !isCreator;
  const canCancel = game.state === 0 && isCreator;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, animation: "fadeIn 0.2s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#12121a", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 16, padding: 32, width: "90%", maxWidth: 480, animation: "slideUp 0.3s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Game #{game.id}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#6b6b5a", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            ["Type", game.gameType],
            ["Wager", `${formatEther(game.wagerAmount)} Ξ`],
            ["Pot", `${formatEther(pot)} Ξ`],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ color: "#8b8974", fontSize: 13 }}>{label}</span>
              <span style={{ fontFamily: "'Courier Prime', monospace", fontWeight: 700, color: label === "Wager" || label === "Pot" ? "#d4af37" : "#e8e4d9", fontSize: 18 }}>{val}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ color: "#8b8974", fontSize: 13 }}>Status</span>
            <Badge state={stateName} />
          </div>
          <div style={{ padding: "12px 0" }}>
            <span style={{ color: "#8b8974", fontSize: 13, display: "block", marginBottom: 8 }}>Players</span>
            <div style={{ fontFamily: "'Courier Prime', monospace", fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{shortAddr(game.player1)}</span>
                {game.winner.toLowerCase() === game.player1.toLowerCase() && game.state === 2 && <span style={{ color: "#d4af37", fontWeight: 700 }}>WINNER</span>}
              </div>
              {game.player2 !== ZERO_ADDRESS && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{shortAddr(game.player2)}</span>
                  {game.winner.toLowerCase() === game.player2.toLowerCase() && game.state === 2 && <span style={{ color: "#d4af37", fontWeight: 700 }}>WINNER</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {canJoin && (
          <button
            disabled={isPending}
            onClick={() => writeContract({
              address: CONTRACT_ADDRESS,
              abi: CONTRACT_ABI,
              functionName: "joinGame",
              args: [BigInt(game.id)],
              value: game.wagerAmount,
            })}
            style={{ width: "100%", marginTop: 20, background: "#d4af37", color: "#0a0a0f", border: "none", padding: 12, borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 15 }}
          >
            {isPending ? "Confirm in Wallet..." : `Join Game — Deposit ${formatEther(game.wagerAmount)} Ξ`}
          </button>
        )}

        {canCancel && (
          <button
            disabled={isPending}
            onClick={() => writeContract({
              address: CONTRACT_ADDRESS,
              abi: CONTRACT_ABI,
              functionName: "cancelGame",
              args: [BigInt(game.id)],
            })}
            style={{ width: "100%", marginTop: 20, background: "transparent", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)", padding: 12, borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 15 }}
          >
            {isPending ? "Confirm..." : "Cancel Game — Get Refund"}
          </button>
        )}

        {game.state === 2 && (
          <div style={{ marginTop: 20, padding: 16, background: "rgba(212,175,55,0.06)", borderRadius: 10, border: "1px solid rgba(212,175,55,0.15)", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#8b8974", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Payout</div>
            <div style={{ fontFamily: "'Courier Prime', monospace", fontSize: 24, fontWeight: 700, color: "#d4af37" }}>{formatEther(payout)} Ξ</div>
            <div style={{ fontSize: 11, color: "#6b6b5a", marginTop: 4 }}>5% platform fee applied</div>
          </div>
        )}
      </div>
    </div>
  );
}

function LobbyView() {
  const { address } = useAccount();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameData | null>(null);

  const { data: statsData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getContractStats",
  });

  const { data: gameCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "gameCounter",
  });

  const totalGames = Number(gameCount ?? 0n);
  const stats = statsData as [bigint, bigint, bigint, bigint] | undefined;

  // Build array of game IDs to display (most recent first)
  const gameIds = [];
  for (let i = totalGames - 1; i >= 0 && gameIds.length < 20; i--) {
    gameIds.push(i);
  }

  return (
    <div style={{ animation: "fadeIn 0.4s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-1px" }}>Game Lobby</h1>
          <p style={{ margin: "6px 0 0", color: "#6b6b5a", fontSize: 14 }}>Trustless P2P card games — smart contract escrow, instant payouts</p>
        </div>
        {address && (
          <button onClick={() => setShowCreate(!showCreate)} style={{ background: "#d4af37", color: "#0a0a0f", border: "none", padding: "10px 22px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13, boxShadow: "0 2px 12px rgba(212,175,55,0.2)" }}>
            + Create Game
          </button>
        )}
      </div>

      {showCreate && <CreateGamePanel onSuccess={() => setShowCreate(false)} />}

      <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
        <StatCard label="Total Games" value={totalGames.toLocaleString()} />
        <StatCard label="Volume" value={stats ? `${formatEther(stats[1])} Ξ` : "0 Ξ"} sub="All time" />
        <StatCard label="Fees Earned" value={stats ? `${formatEther(stats[2])} Ξ` : "0 Ξ"} sub="5% platform fee" />
        <StatCard label="Escrow Balance" value={stats ? `${formatEther(stats[3])} Ξ` : "0 Ξ"} sub="Locked in contract" />
      </div>

      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 100px 100px 100px 120px", padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 10, color: "#6b6b5a", textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 600 }}>
          <span>ID</span><span>Players</span><span>Game</span><span>Wager</span><span>Status</span><span></span>
        </div>
        {gameIds.length === 0 && (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#6b6b5a", fontSize: 14 }}>
            No games yet. Be the first to create one!
          </div>
        )}
        {gameIds.map(id => (
          <GameRow key={id} gameId={id} onClick={setSelectedGame} />
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px rgba(52,211,153,0.4)" }} />
          <span style={{ fontSize: 12, color: "#6b6b5a" }}>Base Sepolia Testnet</span>
        </div>
        <a href={`https://sepolia.basescan.org/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#4a4a3e", fontFamily: "'Courier Prime', monospace", textDecoration: "none" }}>
          Contract: {shortAddr(CONTRACT_ADDRESS)}
        </a>
      </div>

      {selectedGame && <GameDetailModal game={selectedGame} onClose={() => setSelectedGame(null)} />}
    </div>
  );
}

function MyGamesView() {
  const { address } = useAccount();

  const { data: playerGameIds } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getPlayerGames",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const [selectedGame, setSelectedGame] = useState<GameData | null>(null);
  const ids = (playerGameIds as bigint[] | undefined) ?? [];

  if (!address) {
    return (
      <div style={{ animation: "fadeIn 0.4s ease" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 700 }}>My Games</h1>
        <div style={{ textAlign: "center", padding: "60px 20px", background: "rgba(255,255,255,0.02)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", marginTop: 28 }}>
          <p style={{ color: "#8b8974", fontSize: 15 }}>Connect your wallet to view your games</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn 0.4s ease" }}>
      <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 700 }}>My Games</h1>
      <p style={{ margin: "0 0 28px", color: "#6b6b5a", fontSize: 14 }}>Your active and completed matches</p>
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 100px 100px 100px 120px", padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 10, color: "#6b6b5a", textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 600 }}>
          <span>ID</span><span>Players</span><span>Game</span><span>Wager</span><span>Status</span><span></span>
        </div>
        {ids.length === 0 && (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#6b6b5a", fontSize: 14 }}>
            No games yet. Head to the lobby to create or join one!
          </div>
        )}
        {[...ids].reverse().map(id => (
          <GameRow key={Number(id)} gameId={Number(id)} onClick={setSelectedGame} />
        ))}
      </div>
      {selectedGame && <GameDetailModal game={selectedGame} onClose={() => setSelectedGame(null)} />}
    </div>
  );
}

function StatsView() {
  const { address } = useAccount();

  const { data: playerStats } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getPlayerStats",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const stats = playerStats as [bigint, bigint, bigint] | undefined;
  const wins = Number(stats?.[0] ?? 0n);
  const losses = Number(stats?.[1] ?? 0n);
  const total = Number(stats?.[2] ?? 0n);
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : "0.0";

  if (!address) {
    return (
      <div style={{ animation: "fadeIn 0.4s ease" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 700 }}>Player Stats</h1>
        <div style={{ textAlign: "center", padding: "60px 20px", background: "rgba(255,255,255,0.02)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", marginTop: 28 }}>
          <p style={{ color: "#8b8974", fontSize: 15 }}>Connect wallet to view stats</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn 0.4s ease" }}>
      <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 700 }}>Player Stats</h1>
      <p style={{ margin: "0 0 28px", color: "#6b6b5a", fontSize: 14 }}>Your performance on the blockchain</p>
      <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
        <StatCard label="Wins" value={String(wins)} />
        <StatCard label="Losses" value={String(losses)} />
        <StatCard label="Total Games" value={String(total)} />
        <StatCard label="Win Rate" value={`${winRate}%`} />
      </div>
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 24 }}>
        <div style={{ fontSize: 11, color: "#8b8974", textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 600, marginBottom: 12 }}>Win Rate Distribution</div>
        <div style={{ height: 32, background: "rgba(255,255,255,0.04)", borderRadius: 8, overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${winRate}%`, background: "linear-gradient(90deg, rgba(212,175,55,0.6), #d4af37)", borderRadius: "8px 0 0 8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#0a0a0f", transition: "width 1s ease", minWidth: total > 0 ? 30 : 0 }}>
            {wins}W
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#6b6b5a" }}>
            {losses}L
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("lobby");

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e8e4d9", fontFamily: "'DM Sans', system-ui, sans-serif", position: "relative", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet" />

      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse at 20% 0%, rgba(212,175,55,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(99,102,241,0.03) 0%, transparent 50%)", pointerEvents: "none" }} />

      <header style={{ borderBottom: "1px solid rgba(212,175,55,0.12)", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, position: "relative", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/cardsharkie-logo.png" alt="Card Sharkie" width="36" height="36" style={{ borderRadius: "50%" }} />
          <div>
            <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px" }}>Card Sharkie</span>
            <span style={{ fontSize: 10, color: "#d4af37", marginLeft: 8, padding: "2px 6px", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 4, fontWeight: 600, verticalAlign: "middle" }}>dApp</span>
          </div>
        </div>

        <nav style={{ display: "flex", gap: 4 }}>
          {["lobby", "my games", "stats"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ background: view === v ? "rgba(212,175,55,0.12)" : "transparent", border: view === v ? "1px solid rgba(212,175,55,0.2)" : "1px solid transparent", color: view === v ? "#d4af37" : "#8b8974", padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, textTransform: "capitalize", transition: "all 0.2s" }}>
              {v}
            </button>
          ))}
        </nav>

        <ConnectButton showBalance={true} chainStatus="icon" accountStatus="address" />
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px", position: "relative", zIndex: 5 }}>
        {view === "lobby" && <LobbyView />}
        {view === "my games" && <MyGamesView />}
        {view === "stats" && <StatsView />}
      </main>
    </div>
  );
}
