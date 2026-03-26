# Card Sharkie

Trustless P2P skill-based card gaming with on-chain escrow on [Base](https://base.org).

Players deposit ETH into a smart contract, play Spades, Tonk, or Blackjack, and the winner gets paid automatically. No middleman, no trust required.

**Live dApp:** [dapp.cardsharkiegames.com](https://dapp.cardsharkiegames.com)
**Verified Contract:** [View on Basescan](https://sepolia.basescan.org/address/0xdd49bcb2cB24d89E876888764c0ABeF7B086dd75#code)

---

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌────────────────────┐
│   Frontend   │     │    Oracle    │     │  Smart Contract    │
│  React/wagmi │     │  C#/.NET     │     │  Solidity (Base)   │
│  RainbowKit  │────▸│  Nethereum   │────▸│  CardSharkieEscrow │
└──────────────┘     └──────────────┘     └────────────────────┘
       │                    ▲
       │              ┌─────┘
       ▼              │
┌──────────────┐      │
│ Game Server  │──────┘
│ ASP.NET      │  POST /resolve
│ SignalR      │  (on game end)
└──────────────┘
```

**Flow:**
1. Player creates a game on the dApp, depositing ETH into the escrow contract
2. Opponent joins by matching the wager
3. Players play the card game via the SignalR game server
4. Game ends — server calls the oracle with the winner
5. Oracle submits `resolveGame()` on-chain — winner receives the pot minus 5% fee

## Project Structure

```
├── contracts/          Solidity smart contract
│   └── CardSharkieEscrow.sol
├── test/               55 unit tests (Hardhat + Chai)
│   └── CardSharkieEscrow.test.ts
├── frontend/           React dApp (Vite + wagmi + RainbowKit)
│   └── src/
│       ├── App.tsx                 Main dApp component
│       └── config/
│           ├── contract.ts         ABI + deployed address
│           └── wagmi.ts            Base Sepolia chain config
├── oracle/             C# oracle service (.NET 9 + Nethereum)
│   ├── Program.cs
│   └── Services/
│       ├── EscrowService.cs        On-chain transaction signing
│       ├── EventListenerService.cs Contract event polling
│       └── OracleApiService.cs     HTTP API for game server
├── scripts/
│   ├── deploy.ts                   Hardhat deploy script
│   └── e2e-testnet.mjs             End-to-end testnet test
└── hardhat.config.ts               Base Sepolia network config
```

## Smart Contract

**CardSharkieEscrow** handles the full game lifecycle:

| State | Description |
|-------|-------------|
| Open | Game created, waiting for opponent |
| Active | Both players deposited, game in progress |
| Resolved | Winner determined, payout sent |
| Disputed | Result contested (1-hour window), owner arbitrates |
| Cancelled | Creator cancelled before opponent joined, refund sent |
| Expired | 24-hour timeout, both players refunded |

**Key features:**
- Configurable platform fee (default 5%, capped at 10%)
- Dispute window with owner arbitration
- Automatic refunds on cancellation and expiry
- Fee withdrawal separated from player funds (cannot drain escrow)

**Deployed to Base Sepolia:**
- Contract: `0xdd49bcb2cB24d89E876888764c0ABeF7B086dd75`
- Oracle: `0x723c85239BdC7f037149E834A55C86979FD8853d`

## Getting Started

### Prerequisites
- Node.js 18+
- .NET 9 SDK (for oracle)
- MetaMask or Coinbase Wallet (configured for Base Sepolia)

### Run the Contract Tests
```bash
npm install
npx hardhat test
```

### Deploy to Base Sepolia
```bash
# Add your private key to .env
echo "PRIVATE_KEY=your_key_here" > .env

# Deploy
npm run deploy:testnet

# Verify on Basescan
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS> <ORACLE_ADDRESS> 500
```

### Run the Frontend
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173 and connect your wallet on Base Sepolia.

### Run the Oracle
```bash
cd oracle
Escrow__OraclePrivateKey=your_oracle_key dotnet run
```
Oracle listens on http://localhost:5100. Health check: `GET /health`.

### Run E2E Testnet Test
```bash
node scripts/e2e-testnet.mjs
```
Creates a game, joins with a second wallet, resolves via oracle, and verifies the payout on-chain.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Solidity 0.8.24, Hardhat, OpenZeppelin patterns |
| Frontend | React, TypeScript, Vite, wagmi, RainbowKit |
| Oracle | C# / .NET 9, Nethereum |
| Game Server | ASP.NET, SignalR, PostgreSQL, Redis |
| Blockchain | Base Sepolia (Coinbase L2) |
| Infrastructure | Docker, Nginx, Traefik, Hostinger VPS |

## Test Results

55 tests covering all contract functions, edge cases, and security:

- Deployment validation
- Game creation, joining, resolution
- Fee calculations and payout accuracy
- Cancellation and expiry with refunds
- Dispute window and arbitration
- Admin functions (oracle, fee, wager limits)
- Regression tests (double-resolve, re-dispute, fee drain protection)

## Roadmap

- [x] Smart contract deployed + verified on Base Sepolia
- [x] Frontend dApp live with wallet integration
- [x] Oracle service with event listener
- [x] E2E testnet test passing
- [x] Game server escrow integration
- [x] Security audit (3 bugs found and fixed)
- [ ] End-to-end gameplay (deposit → play cards → get paid)
- [ ] Security audit by external firm
- [ ] Base Mainnet deployment (capped wagers)
- [ ] Coinbase Wallet fiat onramp

## License

MIT

---

Built by [Vivente Unlimited](https://viventeunlimited.com)
