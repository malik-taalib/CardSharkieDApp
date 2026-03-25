import { useState, useEffect } from "react";

const MOCK_GAMES = [
  { id: 0, player1: "0x7a3B...f92d", player2: null, wager: "0.05", gameType: "Spades", state: "Open", created: "2m ago" },
  { id: 1, player1: "0x1cD4...a81e", player2: "0x9eF2...b34c", wager: "0.1", gameType: "Tonk", state: "Active", created: "8m ago" },
  { id: 2, player1: "0x4bA9...c72f", player2: "0x2dE6...e19a", wager: "0.25", gameType: "Blackjack", state: "Resolved", winner: "0x4bA9...c72f", created: "1h ago" },
  { id: 3, player1: "0x8fC1...d45b", player2: null, wager: "0.02", gameType: "Spades", state: "Open", created: "12m ago" },
  { id: 4, player1: "0x3aE7...f88d", player2: "0x6bD2...c91e", wager: "0.5", gameType: "Tonk", state: "Active", created: "22m ago" },
];

const STATS = { totalGames: 1247, totalVolume: "83.4", totalFees: "4.17", contractBalance: "2.31" };
const PLAYER_STATS = { wins: 23, losses: 11, totalGames: 34, winRate: "67.6" };

const stateColors = {
  Open: { bg: "rgba(16, 185, 129, 0.15)", text: "#34d399", border: "rgba(16, 185, 129, 0.3)" },
  Active: { bg: "rgba(245, 158, 11, 0.15)", text: "#fbbf24", border: "rgba(245, 158, 11, 0.3)" },
  Resolved: { bg: "rgba(99, 102, 241, 0.15)", text: "#a5b4fc", border: "rgba(99, 102, 241, 0.3)" },
  Disputed: { bg: "rgba(239, 68, 68, 0.15)", text: "#fca5a5", border: "rgba(239, 68, 68, 0.3)" },
  Cancelled: { bg: "rgba(107, 114, 128, 0.15)", text: "#9ca3af", border: "rgba(107, 114, 128, 0.3)" },
};

const Badge = ({ state }) => {
  const c = stateColors[state] || stateColors.Cancelled;
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>
      {state === "Active" && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: c.text, marginRight: 5, animation: "pulse 2s infinite" }} />}
      {state}
    </span>
  );
};

const CardIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="13" height="18" rx="2" />
    <rect x="8" y="3" width="13" height="18" rx="2" fill="rgba(212,175,55,0.15)" stroke="currentColor" />
    <text x="12" y="15" fill="currentColor" fontSize="8" fontWeight="bold" textAnchor="middle" stroke="none">♠</text>
  </svg>
);

export default function CardSharkieDApp() {
  const [view, setView] = useState("lobby");
  const [connected, setConnected] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [wager, setWager] = useState("0.05");
  const [gameType, setGameType] = useState("Spades");
  const [toast, setToast] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const StatCard = ({ label, value, sub }) => (
    <div style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 12, padding: "18px 20px", flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 11, color: "#8b8974", textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "#d4af37", fontFamily: "'Courier Prime', monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#6b6b5a", marginTop: 4 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e8e4d9", fontFamily: "'DM Sans', system-ui, sans-serif", position: "relative", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .game-row:hover { background: rgba(212,175,55,0.04) !important; }
        .nav-btn:hover { background: rgba(212,175,55,0.1) !important; }
        .btn-gold:hover { background: #c9a430 !important; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(212,175,55,0.3) !important; }
        .btn-outline:hover { background: rgba(212,175,55,0.1) !important; }
        * { box-sizing: border-box; }
        ::selection { background: rgba(212,175,55,0.3); }
      `}</style>

      {/* Background texture */}
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse at 20% 0%, rgba(212,175,55,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(99,102,241,0.03) 0%, transparent 50%)", pointerEvents: "none" }} />

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", background: "#d4af37", color: "#0a0a0f", padding: "10px 24px", borderRadius: 8, fontWeight: 600, fontSize: 13, zIndex: 100, animation: "slideUp 0.3s ease", boxShadow: "0 8px 30px rgba(212,175,55,0.3)" }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <header style={{ borderBottom: "1px solid rgba(212,175,55,0.12)", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, position: "relative", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ color: "#d4af37" }}><CardIcon /></div>
          <div>
            <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px" }}>Card Sharkie</span>
            <span style={{ fontSize: 10, color: "#d4af37", marginLeft: 8, padding: "2px 6px", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 4, fontWeight: 600, verticalAlign: "middle" }}>dApp</span>
          </div>
        </div>

        <nav style={{ display: "flex", gap: 4 }}>
          {["lobby", "my games", "stats"].map(v => (
            <button key={v} className="nav-btn" onClick={() => setView(v)} style={{ background: view === v ? "rgba(212,175,55,0.12)" : "transparent", border: view === v ? "1px solid rgba(212,175,55,0.2)" : "1px solid transparent", color: view === v ? "#d4af37" : "#8b8974", padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, textTransform: "capitalize", transition: "all 0.2s" }}>
              {v}
            </button>
          ))}
        </nav>

        <button className={connected ? "btn-outline" : "btn-gold"} onClick={() => { setConnected(!connected); showToast(connected ? "Wallet disconnected" : "Wallet connected: 0x7a3B...f92d"); }} style={{ background: connected ? "transparent" : "#d4af37", color: connected ? "#d4af37" : "#0a0a0f", border: connected ? "1px solid rgba(212,175,55,0.4)" : "none", padding: "8px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13, transition: "all 0.2s" }}>
          {connected ? "0x7a3B...f92d" : "Connect Wallet"}
        </button>
      </header>

      {/* Main content */}
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px", position: "relative", zIndex: 5 }}>

        {/* ===== LOBBY VIEW ===== */}
        {view === "lobby" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-1px" }}>Game Lobby</h1>
                <p style={{ margin: "6px 0 0", color: "#6b6b5a", fontSize: 14 }}>Trustless P2P card games — smart contract escrow, instant payouts</p>
              </div>
              {connected && (
                <button className="btn-gold" onClick={() => setShowCreate(!showCreate)} style={{ background: "#d4af37", color: "#0a0a0f", border: "none", padding: "10px 22px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13, transition: "all 0.2s", boxShadow: "0 2px 12px rgba(212,175,55,0.2)" }}>
                  + Create Game
                </button>
              )}
            </div>

            {/* Create game panel */}
            {showCreate && (
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
                    <input type="number" step="0.01" min="0.001" max="10" value={wager} onChange={e => setWager(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#e8e4d9", padding: "8px 14px", borderRadius: 8, fontSize: 16, fontFamily: "'Courier Prime', monospace", fontWeight: 700, outline: "none" }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end" }}>
                    <button className="btn-gold" onClick={() => { setShowCreate(false); showToast(`Game created: ${gameType} for ${wager} ETH`); }} style={{ background: "#d4af37", color: "#0a0a0f", border: "none", padding: "10px 28px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 14, transition: "all 0.2s" }}>
                      Deposit & Create
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Protocol stats bar */}
            <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
              <StatCard label="Total Games" value={STATS.totalGames.toLocaleString()} />
              <StatCard label="Volume" value={`${STATS.totalVolume} Ξ`} sub="All time" />
              <StatCard label="Fees Earned" value={`${STATS.totalFees} Ξ`} sub="5% platform fee" />
              <StatCard label="Escrow Balance" value={`${STATS.contractBalance} Ξ`} sub="Locked in contract" />
            </div>

            {/* Games table */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 100px 100px 100px 120px", padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 10, color: "#6b6b5a", textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 600 }}>
                <span>ID</span><span>Players</span><span>Game</span><span>Wager</span><span>Status</span><span></span>
              </div>

              {MOCK_GAMES.map((g, i) => (
                <div key={g.id} className="game-row" onClick={() => setSelectedGame(g)} style={{ display: "grid", gridTemplateColumns: "60px 1fr 100px 100px 100px 120px", padding: "14px 20px", borderBottom: i < MOCK_GAMES.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", alignItems: "center", cursor: "pointer", transition: "background 0.2s", animation: `slideUp ${0.3 + i * 0.08}s ease` }}>
                  <span style={{ fontFamily: "'Courier Prime', monospace", color: "#6b6b5a", fontSize: 13 }}>#{g.id}</span>
                  <div>
                    <span style={{ fontFamily: "'Courier Prime', monospace", fontSize: 13 }}>{g.player1}</span>
                    {g.player2 && <span style={{ color: "#6b6b5a", margin: "0 6px", fontSize: 12 }}>vs</span>}
                    {g.player2 && <span style={{ fontFamily: "'Courier Prime', monospace", fontSize: 13 }}>{g.player2}</span>}
                    {!g.player2 && <span style={{ color: "#34d399", fontSize: 11, marginLeft: 8, fontWeight: 600 }}>Waiting...</span>}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{g.gameType}</span>
                  <span style={{ fontFamily: "'Courier Prime', monospace", fontSize: 14, fontWeight: 700, color: "#d4af37" }}>{g.wager} Ξ</span>
                  <Badge state={g.state} />
                  <div style={{ textAlign: "right" }}>
                    {g.state === "Open" && connected && (
                      <button className="btn-gold" onClick={(e) => { e.stopPropagation(); showToast(`Joined game #${g.id} — ${g.wager} ETH deposited`); }} style={{ background: "#d4af37", color: "#0a0a0f", border: "none", padding: "6px 16px", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12, transition: "all 0.2s" }}>
                        Join
                      </button>
                    )}
                    {g.state !== "Open" && <span style={{ fontSize: 11, color: "#6b6b5a" }}>{g.created}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Chain info footer */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px rgba(52,211,153,0.4)" }} />
                <span style={{ fontSize: 12, color: "#6b6b5a" }}>Base Mainnet</span>
              </div>
              <span style={{ fontSize: 11, color: "#4a4a3e", fontFamily: "'Courier Prime', monospace" }}>
                Contract: 0x742d...3Fe1
              </span>
            </div>
          </div>
        )}

        {/* ===== MY GAMES VIEW ===== */}
        {view === "my games" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 700, letterSpacing: "-1px" }}>My Games</h1>
            <p style={{ margin: "0 0 28px", color: "#6b6b5a", fontSize: 14 }}>Your active and completed matches</p>

            {!connected ? (
              <div style={{ textAlign: "center", padding: "60px 20px", background: "rgba(255,255,255,0.02)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>🔗</div>
                <p style={{ color: "#8b8974", fontSize: 15, margin: "0 0 16px" }}>Connect your wallet to view games</p>
                <button className="btn-gold" onClick={() => { setConnected(true); showToast("Wallet connected"); }} style={{ background: "#d4af37", color: "#0a0a0f", border: "none", padding: "10px 24px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                  Connect Wallet
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {MOCK_GAMES.slice(0, 3).map((g, i) => (
                  <div key={g.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 20, animation: `slideUp ${0.3 + i * 0.1}s ease` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontFamily: "'Courier Prime', monospace", color: "#6b6b5a" }}>#{g.id}</span>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{g.gameType}</span>
                        <Badge state={g.state} />
                      </div>
                      <span style={{ fontFamily: "'Courier Prime', monospace", fontSize: 18, fontWeight: 700, color: "#d4af37" }}>{g.wager} Ξ</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#6b6b5a" }}>
                      <span>vs {g.player2 || "Waiting for opponent..."}</span>
                      {g.state === "Resolved" && <span style={{ color: "#34d399", fontWeight: 600 }}>Won +{(parseFloat(g.wager) * 2 * 0.95).toFixed(3)} Ξ</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== STATS VIEW ===== */}
        {view === "stats" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 700, letterSpacing: "-1px" }}>Player Stats</h1>
            <p style={{ margin: "0 0 28px", color: "#6b6b5a", fontSize: 14 }}>Your performance on the blockchain</p>

            {connected ? (
              <>
                <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
                  <StatCard label="Wins" value={PLAYER_STATS.wins} />
                  <StatCard label="Losses" value={PLAYER_STATS.losses} />
                  <StatCard label="Total Games" value={PLAYER_STATS.totalGames} />
                  <StatCard label="Win Rate" value={`${PLAYER_STATS.winRate}%`} />
                </div>

                {/* Win rate visual */}
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 24, marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: "#8b8974", textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 600, marginBottom: 12 }}>Win Rate Distribution</div>
                  <div style={{ height: 32, background: "rgba(255,255,255,0.04)", borderRadius: 8, overflow: "hidden", display: "flex" }}>
                    <div style={{ width: `${PLAYER_STATS.winRate}%`, background: "linear-gradient(90deg, rgba(212,175,55,0.6), #d4af37)", borderRadius: "8px 0 0 8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#0a0a0f", transition: "width 1s ease" }}>
                      {PLAYER_STATS.wins}W
                    </div>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#6b6b5a" }}>
                      {PLAYER_STATS.losses}L
                    </div>
                  </div>
                </div>

                {/* Recent results */}
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 24 }}>
                  <div style={{ fontSize: 11, color: "#8b8974", textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 600, marginBottom: 16 }}>Recent Results</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["W","W","L","W","W","W","L","W","L","W"].map((r, i) => (
                      <div key={i} style={{ width: 32, height: 32, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: r === "W" ? "rgba(212,175,55,0.15)" : "rgba(239,68,68,0.12)", color: r === "W" ? "#d4af37" : "#f87171", border: `1px solid ${r === "W" ? "rgba(212,175,55,0.3)" : "rgba(239,68,68,0.2)"}` }}>
                        {r}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 20px", background: "rgba(255,255,255,0.02)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ color: "#8b8974", fontSize: 15 }}>Connect wallet to view stats</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Game detail modal */}
      {selectedGame && (
        <div onClick={() => setSelectedGame(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, animation: "fadeIn 0.2s ease" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#12121a", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 16, padding: 32, width: "90%", maxWidth: 480, animation: "slideUp 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Game #{selectedGame.id}</h2>
              <button onClick={() => setSelectedGame(null)} style={{ background: "none", border: "none", color: "#6b6b5a", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ color: "#8b8974", fontSize: 13 }}>Type</span>
                <span style={{ fontWeight: 600 }}>{selectedGame.gameType}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ color: "#8b8974", fontSize: 13 }}>Wager</span>
                <span style={{ fontFamily: "'Courier Prime', monospace", fontWeight: 700, color: "#d4af37", fontSize: 18 }}>{selectedGame.wager} Ξ</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ color: "#8b8974", fontSize: 13 }}>Pot</span>
                <span style={{ fontFamily: "'Courier Prime', monospace", fontWeight: 700, fontSize: 18 }}>{(parseFloat(selectedGame.wager) * 2).toFixed(2)} Ξ</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ color: "#8b8974", fontSize: 13 }}>Status</span>
                <Badge state={selectedGame.state} />
              </div>
              <div style={{ padding: "12px 0" }}>
                <span style={{ color: "#8b8974", fontSize: 13, display: "block", marginBottom: 8 }}>Players</span>
                <div style={{ fontFamily: "'Courier Prime', monospace", fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{selectedGame.player1}</span>
                    {selectedGame.winner === selectedGame.player1 && <span style={{ color: "#d4af37", fontWeight: 700 }}>WINNER</span>}
                  </div>
                  {selectedGame.player2 && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>{selectedGame.player2}</span>
                      {selectedGame.winner === selectedGame.player2 && <span style={{ color: "#d4af37", fontWeight: 700 }}>WINNER</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {selectedGame.state === "Open" && connected && (
              <button className="btn-gold" onClick={() => { setSelectedGame(null); showToast(`Joined game #${selectedGame.id}`); }} style={{ width: "100%", marginTop: 20, background: "#d4af37", color: "#0a0a0f", border: "none", padding: "12px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 15, transition: "all 0.2s" }}>
                Join Game — Deposit {selectedGame.wager} Ξ
              </button>
            )}

            {selectedGame.state === "Resolved" && (
              <div style={{ marginTop: 20, padding: 16, background: "rgba(212,175,55,0.06)", borderRadius: 10, border: "1px solid rgba(212,175,55,0.15)", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#8b8974", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Payout</div>
                <div style={{ fontFamily: "'Courier Prime', monospace", fontSize: 24, fontWeight: 700, color: "#d4af37" }}>{(parseFloat(selectedGame.wager) * 2 * 0.95).toFixed(4)} Ξ</div>
                <div style={{ fontSize: 11, color: "#6b6b5a", marginTop: 4 }}>5% platform fee applied</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
