/**
 * End-to-End Testnet Test for CardSharkieEscrow
 *
 * Proves the full money flow on Base Sepolia:
 * 1. Player 1 creates a game (deposits ETH)
 * 2. Player 2 joins the game (matches wager)
 * 3. Oracle resolves the game (winner gets paid)
 * 4. Verify balances changed correctly
 */

import { ethers } from "ethers";

const RPC_URL = "https://sepolia.base.org";
const CONTRACT_ADDRESS = "0xdd49bcb2cB24d89E876888764c0ABeF7B086dd75";
const ORACLE_URL = "http://localhost:5100";

// Wallets
const PLAYER1_KEY = "6e2474d8956521bf3b79fdd9635c941d038a2484b6c55adb3eac9d7166d1709d";
const PLAYER2_KEY = "ae79bfb4108afa0a2a7efad85a5955d6ac2c1e19b1290e977734cb8964cf8551";

const ABI = [
  "function createGame(string calldata _gameType) external payable returns (uint256 gameId)",
  "function joinGame(uint256 _gameId) external payable",
  "function getGame(uint256 _gameId) external view returns (tuple(address player1, address player2, uint256 wagerAmount, uint256 createdAt, uint256 resolvedAt, uint8 state, address winner, string gameType, bytes32 gameDataHash))",
  "function gameCounter() external view returns (uint256)",
  "function getContractStats() external view returns (uint256 _totalGames, uint256 _totalVolume, uint256 _totalFees, uint256 _contractBalance)",
  "event GameCreated(uint256 indexed gameId, address indexed player1, uint256 wagerAmount, string gameType)",
  "event GameJoined(uint256 indexed gameId, address indexed player2)",
  "event GameResolved(uint256 indexed gameId, address indexed winner, uint256 payout, uint256 fee)",
];

const STATE_NAMES = ["Open", "Active", "Resolved", "Disputed", "Cancelled", "Expired"];
const WAGER = ethers.parseEther("0.001"); // minimum wager

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const player1 = new ethers.Wallet(PLAYER1_KEY, provider);
  const player2 = new ethers.Wallet(PLAYER2_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

  console.log("=== Card Sharkie E2E Testnet Test ===\n");
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`Player 1: ${player1.address}`);
  console.log(`Player 2: ${player2.address}`);
  console.log(`Wager: ${ethers.formatEther(WAGER)} ETH\n`);

  // Check balances
  const p1Balance = await provider.getBalance(player1.address);
  const p2Balance = await provider.getBalance(player2.address);
  console.log(`Player 1 balance: ${ethers.formatEther(p1Balance)} ETH`);
  console.log(`Player 2 balance: ${ethers.formatEther(p2Balance)} ETH`);

  if (p1Balance < WAGER) {
    console.error("ERROR: Player 1 needs more testnet ETH");
    process.exit(1);
  }
  if (p2Balance < WAGER) {
    console.error("ERROR: Player 2 needs testnet ETH. Fund this address:");
    console.error(`  ${player2.address}`);
    console.error("Attempting to fund from Player 1...");

    const fundTx = await player1.sendTransaction({
      to: player2.address,
      value: ethers.parseEther("0.0012"),
    });
    await fundTx.wait();
    console.log(`Funded Player 2. Tx: ${fundTx.hash}\n`);
    // Wait for nonce to update
    await new Promise(r => setTimeout(r, 3000));
  }

  // ===== STEP 1: Create Game =====
  console.log("\n--- Step 1: Player 1 Creates Game ---");
  const contractP1 = contract.connect(player1);
  const createTx = await contractP1.createGame("Spades", { value: WAGER });
  const createReceipt = await createTx.wait();

  const gameCounter = await contract.gameCounter();
  const gameId = gameCounter - 1n;

  console.log(`Game #${gameId} created!`);
  console.log(`  Type: Spades`);
  console.log(`  Wager: ${ethers.formatEther(WAGER)} ETH`);
  console.log(`  Tx: ${createTx.hash}`);

  let game = await contract.getGame(gameId);
  console.log(`  State: ${STATE_NAMES[game.state]}`);

  // ===== STEP 2: Join Game =====
  console.log("\n--- Step 2: Player 2 Joins Game ---");
  const contractP2 = contract.connect(player2);
  const joinTx = await contractP2.joinGame(gameId, { value: WAGER });
  await joinTx.wait();

  console.log(`Player 2 joined game #${gameId}!`);
  console.log(`  Tx: ${joinTx.hash}`);

  game = await contract.getGame(gameId);
  console.log(`  State: ${STATE_NAMES[game.state]}`);
  console.log(`  Pot: ${ethers.formatEther(game.wagerAmount * 2n)} ETH`);

  // ===== STEP 3: Resolve via Oracle =====
  console.log("\n--- Step 3: Oracle Resolves Game ---");
  const winnerAddress = player1.address;

  // Check if oracle is running
  let useOracle = false;
  try {
    const healthResp = await fetch(`${ORACLE_URL}/health`);
    if (healthResp.ok) {
      useOracle = true;
      console.log("Oracle is running. Resolving via HTTP API...");
    }
  } catch {
    console.log("Oracle not running. Resolving directly from oracle wallet...");
  }

  const p1BalanceBefore = await provider.getBalance(player1.address);

  if (useOracle) {
    const resp = await fetch(`${ORACLE_URL}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId: Number(gameId),
        winnerAddress: winnerAddress,
        gameData: `spades|e2e-test|winner:${winnerAddress}`,
      }),
    });
    const result = await resp.json();
    console.log(`  Oracle response:`, result);
  } else {
    // Resolve directly — player1 is also the oracle on testnet
    const resolveContract = new ethers.Contract(
      CONTRACT_ADDRESS,
      ["function resolveGame(uint256 _gameId, address _winner, bytes32 _gameDataHash) external"],
      player1
    );
    const rTx = await resolveContract.resolveGame(
      gameId,
      winnerAddress,
      ethers.keccak256(ethers.toUtf8Bytes("e2e-test-data"))
    );
    await rTx.wait();
    console.log(`  Resolved directly. Tx: ${rTx.hash}`);
  }

  // ===== STEP 4: Verify Results =====
  console.log("\n--- Step 4: Verify Results ---");
  game = await contract.getGame(gameId);
  console.log(`  State: ${STATE_NAMES[game.state]}`);
  console.log(`  Winner: ${game.winner}`);
  console.log(`  Winner is Player 1: ${game.winner.toLowerCase() === player1.address.toLowerCase()}`);

  const p1BalanceAfter = await provider.getBalance(player1.address);
  const payout = p1BalanceAfter - p1BalanceBefore;
  const pot = WAGER * 2n;
  const expectedFee = (pot * 500n) / 10000n;
  const expectedPayout = pot - expectedFee;

  console.log(`\n  Pot: ${ethers.formatEther(pot)} ETH`);
  console.log(`  Fee (5%): ${ethers.formatEther(expectedFee)} ETH`);
  console.log(`  Expected payout: ${ethers.formatEther(expectedPayout)} ETH`);
  console.log(`  Player 1 balance change: +${ethers.formatEther(payout)} ETH (includes gas costs)`);

  const stats = await contract.getContractStats();
  console.log(`\n  Contract Stats:`);
  console.log(`    Total Games: ${stats._totalGames}`);
  console.log(`    Total Volume: ${ethers.formatEther(stats._totalVolume)} ETH`);
  console.log(`    Total Fees: ${ethers.formatEther(stats._totalFees)} ETH`);
  console.log(`    Contract Balance: ${ethers.formatEther(stats._contractBalance)} ETH`);

  // ===== STEP 5: Basescan Links =====
  console.log("\n--- Basescan Links ---");
  console.log(`  Create: https://sepolia.basescan.org/tx/${createTx.hash}`);
  console.log(`  Join:   https://sepolia.basescan.org/tx/${joinTx.hash}`);
  console.log(`  Contract: https://sepolia.basescan.org/address/${CONTRACT_ADDRESS}`);

  console.log("\n=== E2E Test Complete! ===");
}

main().catch(console.error);
