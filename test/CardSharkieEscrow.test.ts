import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("CardSharkieEscrow", function () {
  const FEE_BPS = 500; // 5%
  const WAGER = ethers.parseEther("0.01");
  const GAME_TYPE = "Spades";
  const GAME_DATA_HASH = ethers.keccak256(ethers.toUtf8Bytes("game-replay-data"));

  async function deployFixture() {
    const [owner, oracle, player1, player2, outsider] = await ethers.getSigners();
    const CardSharkieEscrow = await ethers.getContractFactory("CardSharkieEscrow");
    const escrow = await CardSharkieEscrow.deploy(oracle.address, FEE_BPS);
    return { escrow, owner, oracle, player1, player2, outsider };
  }

  async function gameCreatedFixture() {
    const fixture = await deployFixture();
    const { escrow, player1 } = fixture;
    await escrow.connect(player1).createGame(GAME_TYPE, { value: WAGER });
    return fixture;
  }

  async function gameActiveFixture() {
    const fixture = await gameCreatedFixture();
    const { escrow, player2 } = fixture;
    await escrow.connect(player2).joinGame(0, { value: WAGER });
    return fixture;
  }

  async function gameResolvedFixture() {
    const fixture = await gameActiveFixture();
    const { escrow, oracle, player1 } = fixture;
    await escrow.connect(oracle).resolveGame(0, player1.address, GAME_DATA_HASH);
    return fixture;
  }

  // =========================================================================
  //  DEPLOYMENT
  // =========================================================================

  describe("Deployment", function () {
    it("should set owner, oracle, and fee", async function () {
      const { escrow, owner, oracle } = await loadFixture(deployFixture);
      expect(await escrow.owner()).to.equal(owner.address);
      expect(await escrow.oracle()).to.equal(oracle.address);
      expect(await escrow.platformFeeBps()).to.equal(FEE_BPS);
    });

    it("should reject zero address oracle", async function () {
      const CardSharkieEscrow = await ethers.getContractFactory("CardSharkieEscrow");
      await expect(
        CardSharkieEscrow.deploy(ethers.ZeroAddress, FEE_BPS)
      ).to.be.revertedWith("Invalid oracle");
    });

    it("should reject fee above MAX_FEE", async function () {
      const [, oracle] = await ethers.getSigners();
      const CardSharkieEscrow = await ethers.getContractFactory("CardSharkieEscrow");
      await expect(
        CardSharkieEscrow.deploy(oracle.address, 1001)
      ).to.be.revertedWith("Fee too high");
    });
  });

  // =========================================================================
  //  CREATE GAME
  // =========================================================================

  describe("createGame", function () {
    it("should create a game with correct state", async function () {
      const { escrow, player1 } = await loadFixture(deployFixture);
      await escrow.connect(player1).createGame(GAME_TYPE, { value: WAGER });

      const game = await escrow.getGame(0);
      expect(game.player1).to.equal(player1.address);
      expect(game.player2).to.equal(ethers.ZeroAddress);
      expect(game.wagerAmount).to.equal(WAGER);
      expect(game.state).to.equal(0); // Open
      expect(game.gameType).to.equal(GAME_TYPE);
    });

    it("should emit GameCreated event", async function () {
      const { escrow, player1 } = await loadFixture(deployFixture);
      await expect(escrow.connect(player1).createGame(GAME_TYPE, { value: WAGER }))
        .to.emit(escrow, "GameCreated")
        .withArgs(0, player1.address, WAGER, GAME_TYPE);
    });

    it("should track player games", async function () {
      const { escrow, player1 } = await loadFixture(deployFixture);
      await escrow.connect(player1).createGame(GAME_TYPE, { value: WAGER });
      const games = await escrow.getPlayerGames(player1.address);
      expect(games.length).to.equal(1);
      expect(games[0]).to.equal(0);
    });

    it("should reject wager below minimum", async function () {
      const { escrow, player1 } = await loadFixture(deployFixture);
      await expect(
        escrow.connect(player1).createGame(GAME_TYPE, { value: ethers.parseEther("0.0001") })
      ).to.be.revertedWith("Below minimum wager");
    });

    it("should reject wager above maximum", async function () {
      const { escrow, player1 } = await loadFixture(deployFixture);
      await expect(
        escrow.connect(player1).createGame(GAME_TYPE, { value: ethers.parseEther("11") })
      ).to.be.revertedWith("Above maximum wager");
    });

    it("should reject empty game type", async function () {
      const { escrow, player1 } = await loadFixture(deployFixture);
      await expect(
        escrow.connect(player1).createGame("", { value: WAGER })
      ).to.be.revertedWith("Game type required");
    });

    it("should increment gameCounter", async function () {
      const { escrow, player1 } = await loadFixture(deployFixture);
      await escrow.connect(player1).createGame(GAME_TYPE, { value: WAGER });
      await escrow.connect(player1).createGame("Tonk", { value: WAGER });
      expect(await escrow.gameCounter()).to.equal(2);
    });
  });

  // =========================================================================
  //  JOIN GAME
  // =========================================================================

  describe("joinGame", function () {
    it("should join and transition to Active", async function () {
      const { escrow, player2 } = await loadFixture(gameCreatedFixture);
      await escrow.connect(player2).joinGame(0, { value: WAGER });

      const game = await escrow.getGame(0);
      expect(game.player2).to.equal(player2.address);
      expect(game.state).to.equal(1); // Active
    });

    it("should emit GameJoined event", async function () {
      const { escrow, player2 } = await loadFixture(gameCreatedFixture);
      await expect(escrow.connect(player2).joinGame(0, { value: WAGER }))
        .to.emit(escrow, "GameJoined")
        .withArgs(0, player2.address);
    });

    it("should reject joining your own game", async function () {
      const { escrow, player1 } = await loadFixture(gameCreatedFixture);
      await expect(
        escrow.connect(player1).joinGame(0, { value: WAGER })
      ).to.be.revertedWith("Cannot play yourself");
    });

    it("should reject wrong wager amount", async function () {
      const { escrow, player2 } = await loadFixture(gameCreatedFixture);
      await expect(
        escrow.connect(player2).joinGame(0, { value: ethers.parseEther("0.02") })
      ).to.be.revertedWith("Must match wager");
    });

    it("should reject joining non-open game", async function () {
      const { escrow, outsider } = await loadFixture(gameActiveFixture);
      await expect(
        escrow.connect(outsider).joinGame(0, { value: WAGER })
      ).to.be.revertedWith("Game not open");
    });

    it("should reject joining nonexistent game", async function () {
      const { escrow, player2 } = await loadFixture(gameCreatedFixture);
      await expect(
        escrow.connect(player2).joinGame(99, { value: WAGER })
      ).to.be.revertedWith("Game does not exist");
    });
  });

  // =========================================================================
  //  RESOLVE GAME
  // =========================================================================

  describe("resolveGame", function () {
    it("should resolve and pay winner minus fee", async function () {
      const { escrow, oracle, player1 } = await loadFixture(gameActiveFixture);
      const pot = WAGER * 2n;
      const fee = (pot * BigInt(FEE_BPS)) / 10000n;
      const payout = pot - fee;

      await expect(
        escrow.connect(oracle).resolveGame(0, player1.address, GAME_DATA_HASH)
      ).to.changeEtherBalance(player1, payout);

      const game = await escrow.getGame(0);
      expect(game.state).to.equal(2); // Resolved
      expect(game.winner).to.equal(player1.address);
    });

    it("should emit GameResolved event with correct values", async function () {
      const { escrow, oracle, player1 } = await loadFixture(gameActiveFixture);
      const pot = WAGER * 2n;
      const fee = (pot * BigInt(FEE_BPS)) / 10000n;
      const payout = pot - fee;

      await expect(escrow.connect(oracle).resolveGame(0, player1.address, GAME_DATA_HASH))
        .to.emit(escrow, "GameResolved")
        .withArgs(0, player1.address, payout, fee);
    });

    it("should update player stats", async function () {
      const { escrow, oracle, player1, player2 } = await loadFixture(gameActiveFixture);
      await escrow.connect(oracle).resolveGame(0, player1.address, GAME_DATA_HASH);

      const winnerStats = await escrow.getPlayerStats(player1.address);
      expect(winnerStats.wins).to.equal(1);
      expect(winnerStats.losses).to.equal(0);

      const loserStats = await escrow.getPlayerStats(player2.address);
      expect(loserStats.wins).to.equal(0);
      expect(loserStats.losses).to.equal(1);
    });

    it("should update totalVolume and totalFees", async function () {
      const { escrow, oracle, player1 } = await loadFixture(gameActiveFixture);
      await escrow.connect(oracle).resolveGame(0, player1.address, GAME_DATA_HASH);

      const pot = WAGER * 2n;
      const fee = (pot * BigInt(FEE_BPS)) / 10000n;
      expect(await escrow.totalVolume()).to.equal(pot);
      expect(await escrow.totalFees()).to.equal(fee);
    });

    it("should calculate 5% fee correctly", async function () {
      const { escrow, oracle, player1 } = await loadFixture(gameActiveFixture);
      await escrow.connect(oracle).resolveGame(0, player1.address, GAME_DATA_HASH);

      const pot = WAGER * 2n; // 0.02 ETH
      const expectedFee = pot / 20n; // 5% = 0.001 ETH
      expect(await escrow.totalFees()).to.equal(expectedFee);
    });

    it("should reject non-oracle caller", async function () {
      const { escrow, player1 } = await loadFixture(gameActiveFixture);
      await expect(
        escrow.connect(player1).resolveGame(0, player1.address, GAME_DATA_HASH)
      ).to.be.revertedWith("Not oracle");
    });

    it("should reject resolving non-active game", async function () {
      const { escrow, oracle, player1 } = await loadFixture(gameCreatedFixture);
      await expect(
        escrow.connect(oracle).resolveGame(0, player1.address, GAME_DATA_HASH)
      ).to.be.revertedWith("Game not active");
    });

    it("should reject winner who is not a player", async function () {
      const { escrow, oracle, outsider } = await loadFixture(gameActiveFixture);
      await expect(
        escrow.connect(oracle).resolveGame(0, outsider.address, GAME_DATA_HASH)
      ).to.be.revertedWith("Winner must be a player");
    });
  });

  // =========================================================================
  //  CANCEL GAME
  // =========================================================================

  describe("cancelGame", function () {
    it("should cancel and refund creator", async function () {
      const { escrow, player1 } = await loadFixture(gameCreatedFixture);
      await expect(
        escrow.connect(player1).cancelGame(0)
      ).to.changeEtherBalance(player1, WAGER);

      const game = await escrow.getGame(0);
      expect(game.state).to.equal(4); // Cancelled
    });

    it("should emit GameCancelled event", async function () {
      const { escrow, player1 } = await loadFixture(gameCreatedFixture);
      await expect(escrow.connect(player1).cancelGame(0))
        .to.emit(escrow, "GameCancelled")
        .withArgs(0);
    });

    it("should reject cancel by non-creator", async function () {
      const { escrow, player2 } = await loadFixture(gameCreatedFixture);
      await expect(
        escrow.connect(player2).cancelGame(0)
      ).to.be.revertedWith("Only creator can cancel");
    });

    it("should reject cancel of active game", async function () {
      const { escrow, player1 } = await loadFixture(gameActiveFixture);
      await expect(
        escrow.connect(player1).cancelGame(0)
      ).to.be.revertedWith("Can only cancel open games");
    });
  });

  // =========================================================================
  //  DISPUTE
  // =========================================================================

  describe("disputeGame", function () {
    it("should dispute within window", async function () {
      const { escrow, player2 } = await loadFixture(gameResolvedFixture);
      await expect(escrow.connect(player2).disputeGame(0))
        .to.emit(escrow, "GameDisputed")
        .withArgs(0, player2.address);

      const game = await escrow.getGame(0);
      expect(game.state).to.equal(3); // Disputed
    });

    it("should reject dispute after window closes", async function () {
      const { escrow, player2 } = await loadFixture(gameResolvedFixture);
      await time.increase(3601); // 1 hour + 1 second
      await expect(
        escrow.connect(player2).disputeGame(0)
      ).to.be.revertedWith("Dispute window closed");
    });

    it("should reject dispute by non-player", async function () {
      const { escrow, outsider } = await loadFixture(gameResolvedFixture);
      await expect(
        escrow.connect(outsider).disputeGame(0)
      ).to.be.revertedWith("Not a player");
    });

    it("should reject dispute on non-resolved game", async function () {
      const { escrow, player1 } = await loadFixture(gameActiveFixture);
      await expect(
        escrow.connect(player1).disputeGame(0)
      ).to.be.revertedWith("Game not resolved");
    });
  });

  // =========================================================================
  //  RESOLVE DISPUTE
  // =========================================================================

  describe("resolveDispute", function () {
    it("should resolve dispute and update winner", async function () {
      const { escrow, owner, player2 } = await loadFixture(gameResolvedFixture);
      await escrow.connect(player2).disputeGame(0);

      await expect(escrow.connect(owner).resolveDispute(0, player2.address))
        .to.emit(escrow, "DisputeResolved")
        .withArgs(0, player2.address);

      const game = await escrow.getGame(0);
      expect(game.state).to.equal(2); // Resolved
      expect(game.winner).to.equal(player2.address);
    });

    it("should reject non-owner", async function () {
      const { escrow, player2 } = await loadFixture(gameResolvedFixture);
      await escrow.connect(player2).disputeGame(0);

      await expect(
        escrow.connect(player2).resolveDispute(0, player2.address)
      ).to.be.revertedWith("Not owner");
    });

    it("should reject if game not disputed", async function () {
      const { escrow, owner, player1 } = await loadFixture(gameResolvedFixture);
      await expect(
        escrow.connect(owner).resolveDispute(0, player1.address)
      ).to.be.revertedWith("Not disputed");
    });
  });

  // =========================================================================
  //  EXPIRE GAME
  // =========================================================================

  describe("expireGame", function () {
    it("should expire open game after timeout and refund player1", async function () {
      const { escrow, player1 } = await loadFixture(gameCreatedFixture);
      await time.increase(86401); // 24 hours + 1 second

      await expect(escrow.expireGame(0)).to.changeEtherBalance(player1, WAGER);

      const game = await escrow.getGame(0);
      expect(game.state).to.equal(5); // Expired
    });

    it("should expire active game and refund both players", async function () {
      const { escrow, player1, player2 } = await loadFixture(gameActiveFixture);
      await time.increase(86401);

      const p1Before = await ethers.provider.getBalance(player1.address);
      const p2Before = await ethers.provider.getBalance(player2.address);

      await escrow.expireGame(0);

      const p1After = await ethers.provider.getBalance(player1.address);
      const p2After = await ethers.provider.getBalance(player2.address);

      expect(p1After - p1Before).to.equal(WAGER);
      expect(p2After - p2Before).to.equal(WAGER);

      const game = await escrow.getGame(0);
      expect(game.state).to.equal(5); // Expired
    });

    it("should emit GameExpired event", async function () {
      const { escrow } = await loadFixture(gameCreatedFixture);
      await time.increase(86401);
      await expect(escrow.expireGame(0))
        .to.emit(escrow, "GameExpired")
        .withArgs(0);
    });

    it("should reject expire before timeout", async function () {
      const { escrow } = await loadFixture(gameCreatedFixture);
      await expect(escrow.expireGame(0)).to.be.revertedWith("Not yet expired");
    });

    it("should reject expire on resolved game", async function () {
      const { escrow } = await loadFixture(gameResolvedFixture);
      await time.increase(86401);
      await expect(escrow.expireGame(0)).to.be.revertedWith("Cannot expire");
    });
  });

  // =========================================================================
  //  ADMIN FUNCTIONS
  // =========================================================================

  describe("Admin", function () {
    it("should update oracle", async function () {
      const { escrow, owner, outsider } = await loadFixture(deployFixture);
      await expect(escrow.connect(owner).setOracle(outsider.address))
        .to.emit(escrow, "OracleUpdated")
        .withArgs(outsider.address);
      expect(await escrow.oracle()).to.equal(outsider.address);
    });

    it("should reject zero address oracle", async function () {
      const { escrow, owner } = await loadFixture(deployFixture);
      await expect(
        escrow.connect(owner).setOracle(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid oracle");
    });

    it("should update fee", async function () {
      const { escrow, owner } = await loadFixture(deployFixture);
      await escrow.connect(owner).setFee(300);
      expect(await escrow.platformFeeBps()).to.equal(300);
    });

    it("should reject fee above MAX_FEE", async function () {
      const { escrow, owner } = await loadFixture(deployFixture);
      await expect(escrow.connect(owner).setFee(1001)).to.be.revertedWith("Fee too high");
    });

    it("should update wager limits", async function () {
      const { escrow, owner } = await loadFixture(deployFixture);
      await escrow.connect(owner).setWagerLimits(ethers.parseEther("0.01"), ethers.parseEther("5"));
      expect(await escrow.minWager()).to.equal(ethers.parseEther("0.01"));
      expect(await escrow.maxWager()).to.equal(ethers.parseEther("5"));
    });

    it("should reject invalid wager limits", async function () {
      const { escrow, owner } = await loadFixture(deployFixture);
      await expect(
        escrow.connect(owner).setWagerLimits(ethers.parseEther("5"), ethers.parseEther("1"))
      ).to.be.revertedWith("Invalid limits");
    });

    it("should withdraw only accumulated fees, not player funds", async function () {
      const { escrow, owner, oracle, player1, player2 } = await loadFixture(gameActiveFixture);

      // Create a second game that stays open (player funds in contract)
      await escrow.connect(player1).createGame("Tonk", { value: WAGER });

      // Resolve game 0
      await escrow.connect(oracle).resolveGame(0, player1.address, GAME_DATA_HASH);

      const pot = WAGER * 2n;
      const fee = (pot * BigInt(FEE_BPS)) / 10000n;

      // withdrawFees should only withdraw the fee, not the open game's wager
      await expect(escrow.connect(owner).withdrawFees()).to.changeEtherBalance(owner, fee);

      // Contract should still hold the open game's wager
      const balance = await ethers.provider.getBalance(await escrow.getAddress());
      expect(balance).to.equal(WAGER);
    });

    it("should reject withdraw with no accumulated fees", async function () {
      const { escrow, owner } = await loadFixture(deployFixture);
      await expect(escrow.connect(owner).withdrawFees()).to.be.revertedWith("No fees to withdraw");
    });

    it("should transfer ownership", async function () {
      const { escrow, owner, outsider } = await loadFixture(deployFixture);
      await escrow.connect(owner).transferOwnership(outsider.address);
      expect(await escrow.owner()).to.equal(outsider.address);
    });

    it("should reject non-owner admin calls", async function () {
      const { escrow, outsider } = await loadFixture(deployFixture);
      await expect(escrow.connect(outsider).setFee(100)).to.be.revertedWith("Not owner");
      await expect(escrow.connect(outsider).setOracle(outsider.address)).to.be.revertedWith("Not owner");
      await expect(escrow.connect(outsider).withdrawFees()).to.be.revertedWith("Not owner");
    });
  });

  // =========================================================================
  //  VIEW FUNCTIONS
  // =========================================================================

  describe("View functions", function () {
    it("should return open games", async function () {
      const { escrow, player1, player2 } = await loadFixture(deployFixture);
      await escrow.connect(player1).createGame("Spades", { value: WAGER });
      await escrow.connect(player1).createGame("Tonk", { value: WAGER });
      await escrow.connect(player2).joinGame(0, { value: WAGER }); // game 0 now Active

      const openGames = await escrow.getOpenGames(0, 10);
      expect(openGames.length).to.equal(1);
      expect(openGames[0]).to.equal(1); // only game 1 is still Open
    });

    it("should return contract stats", async function () {
      const { escrow, oracle, player1, player2 } = await loadFixture(gameActiveFixture);
      await escrow.connect(oracle).resolveGame(0, player1.address, GAME_DATA_HASH);

      const stats = await escrow.getContractStats();
      expect(stats._totalGames).to.equal(1);
      expect(stats._totalVolume).to.equal(WAGER * 2n);
    });
  });

  // =========================================================================
  //  REGRESSION TESTS (from audit)
  // =========================================================================

  describe("Regression", function () {
    it("should reject resolving same game twice", async function () {
      const { escrow, oracle, player1 } = await loadFixture(gameActiveFixture);
      await escrow.connect(oracle).resolveGame(0, player1.address, GAME_DATA_HASH);
      await expect(
        escrow.connect(oracle).resolveGame(0, player1.address, GAME_DATA_HASH)
      ).to.be.revertedWith("Game not active");
    });

    it("should prevent re-dispute after resolveDispute", async function () {
      const { escrow, owner, player2 } = await loadFixture(gameResolvedFixture);
      // Dispute within window
      await escrow.connect(player2).disputeGame(0);
      // Owner resolves dispute (sets new resolvedAt)
      await escrow.connect(owner).resolveDispute(0, player2.address);
      // Advance past dispute window from the new resolvedAt
      await time.increase(3601);
      // Should no longer be disputable
      await expect(
        escrow.connect(player2).disputeGame(0)
      ).to.be.revertedWith("Dispute window closed");
    });

    it("should not allow withdrawFees to drain player funds", async function () {
      const { escrow, owner, player1 } = await loadFixture(gameCreatedFixture);
      // There's an open game with player funds, but no fees
      await expect(
        escrow.connect(owner).withdrawFees()
      ).to.be.revertedWith("No fees to withdraw");
    });
  });
});
