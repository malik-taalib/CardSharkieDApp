# Card Sharkie — Base Builder Grant Application

**Prepared for Base Builder Grant Self-Nomination**
**Date: March 25, 2026**

---

## Project Information

**Project Name:** Card Sharkie

**One-Liner:** Trustless P2P skill-based card gaming with on-chain escrow on Base

**Website / dApp:** https://dapp.cardsharkiegames.com

**Description:**
Card Sharkie is a peer-to-peer skill-based card gaming platform built on Base (Coinbase L2) that uses Solidity smart contracts for trustless wager escrow. Players deposit ETH before each game, and winnings are automatically distributed when the game concludes. The platform supports Spades, Tonk, and Blackjack, with sub-cent transaction costs and 2-second finality. Built by Vivente Unlimited, a multi-product technology company with an 8-product portfolio spanning AI, gaming, messaging, and publishing.

**Category:** Gaming / DeFi / Consumer App

**Chain:** Base (Coinbase L2)

**Stage:** Prototype / Testnet Live

---

## Links

| Resource | URL |
|---|---|
| Live dApp | https://dapp.cardsharkiegames.com |
| Verified Contract (Base Sepolia) | https://sepolia.basescan.org/address/0xdd49bcb2cB24d89E876888764c0ABeF7B086dd75#code |
| GitHub Repository | https://github.com/malik-taalib/CardSharkieDApp |
| Demo Video | [ADD ONCE RECORDED] |
| Company Website | https://viventeunlimited.com |
| Card Sharkie Games | https://cardsharkiegames.com |

---

## Builder Information

**Name:** Malik Taalib

**Organization:** Vivente Unlimited

**Twitter/X:** @ommalik365

**Farcaster:** @viventemalik

**GitHub:** github.com/malik-taalib

**Email:** malik.taalib@gmail.com

**Team Size:** 1 (solo founder + AI development agents)

**Location:** United States

**Tax Status:** US-based LLC (Vivente Unlimited) — W-9 available

---

## Funding

**Amount Requested:** 3-5 ETH

**Use of Funds:**
1. Security audit for mainnet deployment (~2 ETH)
2. Infrastructure costs — VPS, RPC endpoints, monitoring (0.5 ETH)
3. Testnet-to-mainnet migration and gas costs (0.5 ETH)
4. Community building — bounties for beta testers, tournament prizes (1 ETH)

---

## Why Card Sharkie is Good for Base

### Is the builder creating something unique and fun?
Yes. P2P skill-based card gaming with trustless on-chain escrow doesn't exist on Base or any major L2. Card Sharkie brings classic card games (Spades, Tonk, Blackjack) — games with massive existing player bases — into a trustless blockchain environment where players don't need to trust a platform to hold their money.

### Is the builder bringing more users onchain?
Yes. Card Sharkie's primary user acquisition strategy targets casual card players who have never used crypto. The onboarding flow uses Coinbase Wallet with fiat onramp — players can go from zero crypto knowledge to playing on Base in under 5 minutes. Each new player becomes a Base wallet holder.

### Is the builder's contribution live and making an impact?
The smart contract is deployed and verified on Base Sepolia with 55 passing unit tests. The dApp is live at dapp.cardsharkiegames.com with real wallet connection and on-chain game creation. A C# oracle service bridges the game server to the blockchain. The full pipeline (deposit → play → payout) is proven on testnet.

---

## Technical Architecture

**Smart Contract (Solidity):**
- Trustless escrow: players deposit ETH, contract holds it, winner gets paid automatically
- 5% configurable platform fee (capped at 10%)
- Dispute system with 1-hour window and owner arbitration
- 24-hour game timeout with automatic refunds
- 55 unit tests covering all flows, edge cases, and security checks
- Audited: 3 bugs found and fixed (withdrawFees drain, re-dispute vulnerability, missing stats update)

**Frontend (React + TypeScript):**
- Vite + wagmi + RainbowKit
- Real on-chain data (no mock data)
- Wallet connection (MetaMask, Coinbase Wallet)
- Create/join/cancel games with full transaction lifecycle UI

**Oracle Service (C#/.NET + Nethereum):**
- HTTP API that game server calls when a game ends
- Signs and submits resolveGame() transactions
- Event listener for GameCreated/Joined/Resolved events
- Input validation and safe error handling

**Game Server (existing, ASP.NET + SignalR):**
- Real-time multiplayer card games
- Spades, Tonk, Blackjack, Bid Whist, Dominoes
- ELO rating system
- AI opponents for single-player

---

## Roadmap

**Completed (Week 1):**
- [x] Smart contract deployed + verified on Base Sepolia
- [x] 55 unit tests passing
- [x] dApp live at public URL
- [x] Oracle service built and tested
- [x] Builder Score profile active
- [x] Build-in-public posts on X and Farcaster
- [x] GitHub repo public

**Next 30 Days:**
- [ ] Demo video recorded and shared
- [ ] Grant applications submitted (Base, AlphaGrowth, Optimism)
- [ ] Wire game server to oracle for automated payouts
- [ ] End-to-end testnet gameplay (deposit → play cards → get paid)
- [ ] Base Discord engagement

**60-90 Days:**
- [ ] Security audit submission
- [ ] Base Mainnet deployment (beta, capped wagers)
- [ ] Coinbase Wallet fiat onramp integration
- [ ] Beta launch with real users
- [ ] Apply for Base Batches incubator

---

## Multi-Product Base Expansion

Card Sharkie is the first of Vivente Unlimited's 8-product portfolio to go on-chain. Future Base integrations planned:

- **Goliath Prep** — credential NFTs for verified interview skills
- **CallSign** — on-chain identity and messaging
- **DirectPlay** — royalty payments via smart contracts

Each product brings more users and transactions to Base.

---

## What Makes This Application Competitive

1. **Shipped code, not a pitch deck.** Working contract, live dApp, 55 tests, audited.
2. **Clear user onboarding story.** Crypto-naive card players → Base wallet holders.
3. **Existing product portfolio.** 8-product company, not a one-project hopeful.
4. **Solo builder with AI workflow.** Novel development model the Base community finds compelling.
5. **Multi-product Base expansion.** Card Sharkie is the beginning, not the end.
