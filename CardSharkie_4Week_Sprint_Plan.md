# Card Sharkie — 4-Week Grant-Ready Sprint Plan

**Goal:** Deploy Card Sharkie escrow contract to Base Sepolia testnet, connect the dApp frontend, establish ecosystem presence, and submit grant applications.

**Sprint Start:** Week of [your start date]
**Sprint End:** 4 weeks later
**Definition of Done:** Contract live on testnet + dApp demo working + Builder Score profile active + Base grant self-nomination submitted + AlphaGrowth profile live

---

## WEEK 1: Solidity Environment & Contract Deployment

**Theme: Get the contract on-chain**

### Day 1 — Environment Setup

**Morning Block (2-3 hours)**
- Install Node.js 18+ (if not already installed)
- Install Hardhat globally: `npm install -g hardhat`
- Create new project: `npx hardhat init` (choose TypeScript project)
- Install dependencies:
  ```
  npm install --save-dev @nomicfoundation/hardhat-toolbox
  npm install --save-dev @nomicfoundation/hardhat-verify
  npm install dotenv
  ```
- Copy `CardSharkieEscrow.sol` into the `/contracts` directory
- Verify it compiles: `npx hardhat compile`

**Afternoon Block (2-3 hours)**
- Configure `hardhat.config.ts` for Base Sepolia:
  ```typescript
  networks: {
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 84532
    }
  }
  ```
- Create a `.env` file with your deployer wallet private key
- Get Base Sepolia testnet ETH from the faucet: https://docs.base.org/base-chain/tools/network-faucets
- Write the deploy script in `/scripts/deploy.ts`

**End of Day Checkpoint:** Contract compiles. Hardhat project configured for Base Sepolia. Testnet ETH in your wallet.

---

### Day 2 — Unit Tests (Core Functions)

**Full Day Block (4-6 hours)**
Write tests in `/test/CardSharkieEscrow.test.ts` for:

- `createGame()` — verify game is created, ETH deposited, state is Open, event emitted
- `joinGame()` — verify opponent joins, wager matches, state transitions to Active
- `resolveGame()` — verify only oracle can call, winner receives payout minus fee, state transitions to Resolved
- `cancelGame()` — verify only creator can cancel, ETH refunded, state transitions to Cancelled

Run tests: `npx hardhat test`

**End of Day Checkpoint:** 4 core function tests passing. You understand the Hardhat testing patterns (ethers, expect, loadFixture).

---

### Day 3 — Unit Tests (Edge Cases & Security)

**Full Day Block (4-6 hours)**
Write tests for:

- Cannot join your own game
- Cannot join with wrong wager amount
- Cannot resolve game that isn't Active
- Non-oracle cannot call resolveGame
- Dispute within window succeeds; dispute after window fails
- `expireGame()` works after 24-hour timeout (use Hardhat's time manipulation: `await time.increase(86400)`)
- Fee calculation is accurate (5% of pot)
- Fee cap cannot exceed 10%
- Reentrancy protection (state changes before transfers)

Run full suite: `npx hardhat test`

**End of Day Checkpoint:** 12-15 tests passing. All happy paths and critical security checks covered.

---

### Day 4 — Deploy to Base Sepolia Testnet

**Morning Block (2-3 hours)**
- Final compile: `npx hardhat compile`
- Deploy: `npx hardhat run scripts/deploy.ts --network baseSepolia`
- Record the deployed contract address
- Verify the contract on Basescan:
  ```
  npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS> <ORACLE_ADDRESS> <FEE_BPS>
  ```
- Go to https://sepolia.basescan.org and confirm your contract is verified and readable

**Afternoon Block (2-3 hours)**
- Manually test on testnet using Basescan's "Write Contract" interface:
  - Call `createGame("Spades")` with 0.01 ETH
  - From a second wallet, call `joinGame(0)` with 0.01 ETH
  - From the oracle wallet, call `resolveGame(0, winnerAddress, gameDataHash)`
  - Verify the winner received the payout
- Screenshot everything — you'll use these in grant applications and social posts

**End of Day Checkpoint:** Contract live and verified on Base Sepolia. At least one full game lifecycle tested on-chain. Basescan link saved.

---

### Day 5 — Ecosystem Account Setup

**Morning Block (2 hours)**
- **Coinbase Wallet:** Download and set up if you don't have one. Add Base Sepolia network.
- **Farcaster/Warpcast:** Sign up at https://warpcast.com (~$5 onchain registration fee). Set up your profile:
  - Display name: Your name
  - Bio: "Building Card Sharkie — trustless P2P card gaming on @base | Founder @ViventeUnlimited"
  - Link your website
  - Follow: @base, @buildonbase, @jessepollak, @zora, @coinbase

**Afternoon Block (2-3 hours)**
- **Builder Score:** Register at https://www.builderscore.xyz/
  - Connect your wallet
  - Link GitHub (push the Hardhat project to a public repo first)
  - Link Twitter/X
  - Link Farcaster
- **First build-in-public post on Twitter/X:**
  - "Day 1 of building Card Sharkie on @base 🔵 Deployed a trustless P2P escrow contract for skill-based card games. Players deposit ETH, smart contract holds it, winner gets paid automatically. Contract live on Base Sepolia: [basescan link] #BuildOnBase"
- **First Farcaster post** in /base-builds channel — similar content

**End of Day Checkpoint:** Farcaster account live. Builder Score profile active. First public post shipped.

---

## WEEK 2: Frontend Blockchain Integration

**Theme: Make the dApp talk to the real contract**

### Day 6 — React Project Setup with Web3

**Full Day Block (5-6 hours)**
- Create new React project (or use your existing React setup): `npx create-react-app card-sharkie --template typescript`
- Install Web3 dependencies:
  ```
  npm install wagmi viem @tanstack/react-query
  npm install @rainbow-me/rainbowkit
  ```
- Configure the Wagmi provider in your app root:
  - Set up Base Sepolia chain configuration
  - Configure RainbowKit with Coinbase Wallet + MetaMask connectors
  - Set up QueryClient for TanStack Query
- Copy the contract ABI from `artifacts/contracts/CardSharkieEscrow.sol/CardSharkieEscrow.json` into your frontend as a constant
- Create a `config.ts` with your deployed contract address and ABI

**End of Day Checkpoint:** React app boots with RainbowKit wallet connection modal working. You can connect MetaMask/Coinbase Wallet on Base Sepolia.

---

### Day 7 — Read Functions (Lobby & Stats)

**Full Day Block (5-6 hours)**
- Build contract read hooks using Wagmi's `useReadContract`:
  - `getOpenGames()` — populate the lobby
  - `getGame(id)` — game detail modal
  - `getPlayerStats(address)` — stats page
  - `getContractStats()` — protocol-level stats bar
- Wire these into the UI components from the prototype we built
- Replace all mock data with real on-chain data
- Handle loading states and error states for each read

**End of Day Checkpoint:** Lobby displays real open games from the testnet contract. Stats show real data. Loading spinners work.

---

### Day 8 — Write Functions (Create & Join)

**Full Day Block (5-6 hours)**
- Build contract write hooks using Wagmi's `useWriteContract`:
  - `createGame()` — user selects game type, enters wager, confirms transaction
  - `joinGame()` — user matches wager, confirms transaction
  - `cancelGame()` — creator cancels an open game
- Handle transaction lifecycle in the UI:
  - Waiting for wallet confirmation
  - Transaction pending (show spinner with "Confirming on Base...")
  - Transaction confirmed (show success toast, refresh lobby)
  - Transaction failed (show error message)
- Add `useWaitForTransactionReceipt` for confirmation tracking

**End of Day Checkpoint:** You can create a game from the UI, see it appear in the lobby, and join it from a second wallet. Transactions flow through MetaMask/Coinbase Wallet cleanly.

---

### Day 9 — Game Detail & Polish

**Morning Block (3 hours)**
- Build the game detail modal with real on-chain data
- Show payout calculations (pot, fee, winner take)
- Display game state transitions with proper badge colors
- Link each game to its Basescan transaction

**Afternoon Block (3 hours)**
- Add wallet-aware UI:
  - Show "Connect Wallet" if not connected
  - Show user's address in header when connected
  - Disable "Join" button on your own games
  - Show "Cancel" button only on games you created
- Responsive cleanup — make sure it looks clean on mobile
- Push code to GitHub public repo

**End of Day Checkpoint:** Full dApp flow works: connect wallet → create game → see it in lobby → join from another wallet → view game details. All on-chain, all real.

---

### Day 10 — Demo Recording & Second Social Post

**Morning Block (2-3 hours)**
- Record a screen capture demo (2-3 minutes) showing:
  1. Connect wallet to Card Sharkie
  2. Create a game (Spades, 0.01 ETH)
  3. Switch to second wallet, join the game
  4. Show the game detail with real on-chain data
  5. Show the Basescan transaction links
- Upload to YouTube or Loom (unlisted is fine)

**Afternoon Block (2 hours)**
- **Twitter/X thread (Week 2 update):**
  - "Week 2 building Card Sharkie on @base 🔵 The dApp is live on testnet. Connect your wallet, create a game, deposit ETH, and it's all handled by a smart contract. No middleman, no trust required. Demo: [video link] Repo: [github link] #BuildOnBase"
- **Farcaster post** with demo link in /base-builds
- Engage with 3-5 other Base builders' posts (genuine comments, not spam)

**End of Day Checkpoint:** Demo video recorded and posted. GitHub repo updated. Two weeks of public build progress documented.

---

## WEEK 3: Oracle Prototype & Grant Applications

**Theme: Close the loop and apply for money**

### Day 11 — Nethereum Oracle Prototype (C#)

**Full Day Block (5-6 hours)**
- Create a new .NET 8 Console App (or Worker Service): `dotnet new worker -n CardSharkie.Oracle`
- Install Nethereum: `dotnet add package Nethereum.Web3`
- Generate C# contract bindings from the ABI (Nethereum has a code generator, or you can write them manually — it maps cleanly to your existing C# patterns)
- Write the core oracle function:
  ```csharp
  // Pseudocode flow:
  // 1. Receive game result from game server (gameId, winnerAddress, gameDataHash)
  // 2. Build the resolveGame transaction
  // 3. Sign with oracle private key
  // 4. Submit to Base Sepolia
  // 5. Wait for confirmation
  // 6. Log result
  ```
- Test by manually triggering a game resolution from the console app

**End of Day Checkpoint:** C# console app can call `resolveGame()` on the testnet contract and the transaction succeeds. Winner receives payout.

---

### Day 12 — Event Listener & End-to-End Test

**Morning Block (3 hours)**
- Add event listening to the oracle service using Nethereum's event subscription:
  - Listen for `GameCreated` events
  - Listen for `GameJoined` events (this triggers "game is ready to play")
  - Listen for `GameResolved` events (for logging/sync)
- Wire events to console output so you can see the contract talking to your C# service in real time

**Afternoon Block (3 hours)**
- Run a full end-to-end test:
  1. Open the dApp in browser, create a game
  2. Watch the oracle service log the `GameCreated` event
  3. Join the game from a second wallet
  4. Watch the oracle service log the `GameJoined` event
  5. Manually trigger resolution from the oracle service
  6. Watch the payout arrive in the winner's wallet
  7. Verify everything on Basescan
- Document this flow with screenshots

**End of Day Checkpoint:** Full pipeline proven: Frontend → Contract → Oracle → Resolution → Payout. All on Base Sepolia.

---

### Day 13 — AlphaGrowth Profile & Grant Research

**Full Day Block (4-5 hours)**

**Morning — AlphaGrowth Setup:**
- Go to https://alphagrowth.io/grants/apply
- Create your profile using the description text from the Grant Platform Setup Guide
- Fill in all project details, links, deployed contract address, demo video
- Browse matching grants and favorite the top 5
- Submit applications to:
  1. Base Builder Grant (if available through AlphaGrowth)
  2. Any Optimism/OP Stack grants (Card Sharkie is on Base = OP Stack)
  3. Any gaming-focused grants you find

**Afternoon — Grantfarm Research:**
- Go to https://www.blockworks.com/grants
- Filter: Development + Gaming + Base/Ethereum/Optimism
- Filter: Development + AI (pitch the AI-assisted development angle)
- Document any additional programs worth applying to
- Check for relevant RFPs or bounties

**End of Day Checkpoint:** AlphaGrowth profile live with applications submitted. Grantfarm research complete with 3-5 additional targets identified.

---

### Day 14 — Base Builder Grant Self-Nomination

**This is the big one.**

**Morning Block (3 hours)**
- Open the grant application document (CardSharkie_Grant_Application.docx)
- Fill in all placeholder fields:
  - Your Twitter/X handle
  - Your Farcaster handle
  - Your GitHub repo URL
  - Your Base Sepolia contract address (Basescan link)
  - Your email
- Review and customize any sections that need your personal voice
- Save a PDF version for easy sharing

**Afternoon Block (2-3 hours)**
- Go to the Base Builder Grant nomination form:
  https://docs.google.com/forms/d/e/1FAIpQLSfXuEzmiAzRhie_z9raFCF1BXweXgVt18o-DvBuRRgyTygL2A/viewform
- Fill out the nomination with:
  - Link to your deployed testnet contract
  - Link to your dApp demo (deploy to Vercel or your Hostinger VPS)
  - Link to your demo video
  - Link to your GitHub repo
  - Brief description of what Card Sharkie does and why it's good for Base
- Submit the nomination
- **Twitter/X post (Week 3 update):**
  - "Week 3 building Card Sharkie on @base 🔵 Full pipeline working: Smart contract escrow → dApp frontend → C# oracle service. Players deposit, play, and get paid — all trustless, all on-chain. Just submitted for a @BuildOnBase builder grant. Demo: [link] #BuildOnBase"

**End of Day Checkpoint:** Base Builder Grant nomination submitted. Application document finalized. Third week of build-in-public content posted.

---

### Day 15 — Deploy dApp Frontend

**Half Day Block (2-3 hours)**
- Deploy the React dApp to a public URL:
  - **Option A (fastest):** Vercel — `npx vercel` from your project root
  - **Option B:** Build and copy to your Hostinger VPS — `npm run build` then upload the `/build` directory
- Verify the live URL works with wallet connection on Base Sepolia
- Update all grant applications and social profiles with the live dApp URL

**End of Day Checkpoint:** Card Sharkie dApp accessible at a public URL. Anyone can connect a wallet and interact with the testnet contract.

---

## WEEK 4: Polish, Content & Pipeline

**Theme: Maximize visibility and stack applications**

### Day 16 — README & Documentation

**Full Day Block (4-5 hours)**
- Write a comprehensive README.md for the GitHub repo:
  - Project description
  - Architecture diagram (text-based is fine)
  - How to run locally
  - How to deploy
  - Contract addresses (testnet)
  - Screenshots of the dApp
  - Technology stack
  - Roadmap
- Add inline code comments to the Solidity contract (you already have good NatSpec comments)
- Create a `/docs` folder with the architecture spec summary
- This documentation is what grant reviewers and the Base team will look at

**End of Day Checkpoint:** GitHub repo looks professional and well-documented. Anyone visiting can understand what Card Sharkie is and how it works in under 2 minutes.

---

### Day 17 — Additional Grant Applications

**Full Day Block (4-5 hours)**
- Apply to the additional grant programs you identified through Grantfarm research
- For each application, customize the pitch slightly:
  - **Optimism grants:** Emphasize the open-source escrow pattern as a public good on the OP Stack
  - **Gaming grants:** Emphasize the P2P skill gaming market opportunity and user acquisition strategy
  - **AI-related grants:** Emphasize the solo-founder-with-AI-agents development model as proof of AI-augmented shipping speed
  - **Ethereum Foundation ESP** (if applicable): Emphasize the reusable escrow contract pattern as infrastructure for the broader ecosystem
- Track all submissions in a simple spreadsheet: Program | Date Applied | Status | Follow-up Date

**End of Day Checkpoint:** 3-5 additional grant applications submitted beyond Base.

---

### Day 18 — Optimism Atlas Profile (Retro Funding)

**Half Day Block (2-3 hours)**
- Go to https://atlas.optimism.io/
- Create your project profile
- Document Card Sharkie's contributions to the Base/OP ecosystem:
  - Open-source smart contract code
  - New user onboarding to Base
  - Transaction volume on Base
  - Documentation and educational content
- This plants a seed for future retroactive funding rounds — you don't need to apply for a specific round now, but having the profile ready means you're eligible when rounds open

**End of Day Checkpoint:** Optimism Atlas profile live. Positioned for future retro funding.

---

### Day 19 — Final Social Push & Community Engagement

**Full Day Block (3-4 hours)**
- **Twitter/X thread (Week 4 / Sprint Summary):**
  - Thread telling the full 4-week story: what you built, why blockchain escrow matters for skill gaming, the tech stack, what's next
  - Include: testnet contract link, dApp demo link, demo video, GitHub link
  - Tag @BuildOnBase, @base, @Optimism
- **Farcaster long-form post** telling the same story in /base-builds
- Engage with the Base community:
  - Join Base Discord: https://discord.com/invite/buildonbase
  - Introduce yourself in the #builders channel
  - Share your project in any "show what you're building" threads
  - Offer to help other builders if you can — genuine engagement matters

**End of Day Checkpoint:** Comprehensive social presence established. Sprint story documented publicly. Community engagement started.

---

### Day 20 — Sprint Retrospective & Next Phase Planning

**Morning Block (2 hours)**
- Review what's done:
  - [ ] Contract deployed and verified on Base Sepolia
  - [ ] Full test suite passing
  - [ ] dApp live at public URL with real contract integration
  - [ ] Oracle prototype proven (C# → contract → payout)
  - [ ] Builder Score profile active
  - [ ] Farcaster account with build-in-public posts
  - [ ] Base Builder Grant self-nomination submitted
  - [ ] AlphaGrowth profile with applications submitted
  - [ ] 3-5 additional grant applications in pipeline
  - [ ] Optimism Atlas profile live
  - [ ] GitHub repo documented and public
  - [ ] Demo video recorded and shared
- Identify what's incomplete or needs iteration

**Afternoon Block (2 hours)**
- Plan the next phase (Weeks 5-10: road to mainnet):
  - Complete game server integration (SignalR multiplayer)
  - Automated oracle triggering on game completion
  - Security audit submission
  - Mainnet deployment
  - Beta launch with capped wagers

**End of Day Checkpoint:** Sprint complete. Grant pipeline active. Clear roadmap for the next phase.

---

## Daily Rhythm Template

For the days that aren't strictly planned above, maintain this daily rhythm:

| Time | Activity |
|---|---|
| First 15 min | Check grant application statuses, respond to any messages |
| Morning block | Deep work: coding, testing, deploying |
| Lunch break | Quick Farcaster scroll, engage with 1-2 Base builder posts |
| Afternoon block | Deep work continued |
| Last 30 min | Git commit, push code, brief progress note for weekly thread |

---

## Tools & Accounts Needed

**Development:**
- Node.js 18+ and npm
- Hardhat (Solidity development)
- .NET 8 SDK (oracle service)
- MetaMask browser extension (configured for Base Sepolia)
- Visual Studio Code with Solidity extension

**Accounts to Create:**
- Coinbase Wallet (for Base ecosystem identity)
- Farcaster / Warpcast account
- Builder Score profile (builderscore.xyz)
- AlphaGrowth account
- Alchemy account (free tier for RPC endpoint — backup to public Base Sepolia RPC)
- Vercel account (free tier for dApp hosting)

**Testnet Resources:**
- Base Sepolia ETH from faucet (you'll need ETH in at least 2 wallets for testing)
- Base Sepolia RPC: https://sepolia.base.org

---

## Key Metrics to Track During Sprint

| Metric | Target | How to Measure |
|---|---|---|
| Tests passing | 15+ unit tests | `npx hardhat test` |
| Testnet games completed | 10+ full lifecycles | Basescan transaction count |
| Builder Score | Active / scoring | builderscore.xyz dashboard |
| Social posts | 4+ build updates (1/week) | Twitter/Farcaster |
| Grant applications | 4-6 submitted | Your tracking spreadsheet |
| GitHub stars/forks | Any > 0 | GitHub repo |
| Community connections | 10+ Base builders followed/engaged | Farcaster/Twitter |

---

*Ship fast. Ship public. The grant money follows the builders who show up consistently.*
