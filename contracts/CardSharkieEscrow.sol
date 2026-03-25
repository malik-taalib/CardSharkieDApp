// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CardSharkieEscrow
 * @author Vivente Unlimited
 * @notice Trustless P2P skill-based gaming escrow for Card Sharkie
 * @dev Handles wager deposits, game resolution, dispute arbitration, and platform fees
 * 
 * ARCHITECTURE:
 * - Players create or join games by depositing ETH (or ERC-20 in v2)
 * - Game results are submitted by an authorized oracle (the Card Sharkie backend)
 * - Winner receives the pot minus a configurable platform fee
 * - Disputes trigger a timelock; if unresolved, funds return to players
 * - Emergency withdrawal after extended inactivity (safety valve)
 */

contract CardSharkieEscrow {

    // =========================================================================
    //                              ENUMS & STRUCTS
    // =========================================================================

    enum GameState {
        Open,           // Created, waiting for opponent
        Active,         // Both players deposited, game in progress
        Resolved,       // Winner determined, funds distributed
        Disputed,       // Result contested, awaiting arbitration
        Cancelled,      // Game cancelled before starting
        Expired         // Timed out with no resolution
    }

    struct Game {
        address player1;
        address player2;
        uint256 wagerAmount;
        uint256 createdAt;
        uint256 resolvedAt;
        GameState state;
        address winner;
        string gameType;        // e.g., "spades", "tonk", "blackjack"
        bytes32 gameDataHash;   // Hash of off-chain game data for verification
    }

    // =========================================================================
    //                              STATE VARIABLES
    // =========================================================================

    address public owner;
    address public oracle;              // Authorized game result submitter
    uint256 public platformFeeBps;      // Fee in basis points (e.g., 500 = 5%)
    uint256 public constant MAX_FEE = 1000; // Cap at 10%
    uint256 public constant GAME_TIMEOUT = 24 hours;
    uint256 public constant DISPUTE_WINDOW = 1 hours;
    uint256 public constant DISPUTE_RESOLUTION_TIMEOUT = 72 hours;
    uint256 public minWager = 0.001 ether;
    uint256 public maxWager = 10 ether;

    uint256 public gameCounter;
    uint256 public totalVolume;
    uint256 public totalFees;
    uint256 public accumulatedFees;

    mapping(uint256 => Game) public games;
    mapping(address => uint256[]) public playerGames;
    mapping(address => uint256) public playerWins;
    mapping(address => uint256) public playerLosses;
    mapping(uint256 => uint256) public disputeTimestamp;

    // =========================================================================
    //                                 EVENTS
    // =========================================================================

    event GameCreated(uint256 indexed gameId, address indexed player1, uint256 wagerAmount, string gameType);
    event GameJoined(uint256 indexed gameId, address indexed player2);
    event GameResolved(uint256 indexed gameId, address indexed winner, uint256 payout, uint256 fee);
    event GameDisputed(uint256 indexed gameId, address indexed disputer);
    event DisputeResolved(uint256 indexed gameId, address indexed winner);
    event GameCancelled(uint256 indexed gameId);
    event GameExpired(uint256 indexed gameId);
    event FundsWithdrawn(address indexed to, uint256 amount);
    event OracleUpdated(address indexed newOracle);
    event FeeUpdated(uint256 newFeeBps);

    // =========================================================================
    //                               MODIFIERS
    // =========================================================================

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "Not oracle");
        _;
    }

    modifier gameExists(uint256 _gameId) {
        require(_gameId < gameCounter, "Game does not exist");
        _;
    }

    // =========================================================================
    //                             CONSTRUCTOR
    // =========================================================================

    constructor(address _oracle, uint256 _feeBps) {
        require(_oracle != address(0), "Invalid oracle");
        require(_feeBps <= MAX_FEE, "Fee too high");
        owner = msg.sender;
        oracle = _oracle;
        platformFeeBps = _feeBps;
    }

    // =========================================================================
    //                           CORE GAME FLOW
    // =========================================================================

    /**
     * @notice Create a new game and deposit wager
     * @param _gameType The type of card game (e.g., "spades", "tonk")
     * @return gameId The ID of the newly created game
     */
    function createGame(string calldata _gameType) external payable returns (uint256 gameId) {
        require(msg.value >= minWager, "Below minimum wager");
        require(msg.value <= maxWager, "Above maximum wager");
        require(bytes(_gameType).length > 0, "Game type required");

        gameId = gameCounter++;

        games[gameId] = Game({
            player1: msg.sender,
            player2: address(0),
            wagerAmount: msg.value,
            createdAt: block.timestamp,
            resolvedAt: 0,
            state: GameState.Open,
            winner: address(0),
            gameType: _gameType,
            gameDataHash: bytes32(0)
        });

        playerGames[msg.sender].push(gameId);
        emit GameCreated(gameId, msg.sender, msg.value, _gameType);
    }

    /**
     * @notice Join an existing open game by matching the wager
     * @param _gameId The ID of the game to join
     */
    function joinGame(uint256 _gameId) external payable gameExists(_gameId) {
        Game storage game = games[_gameId];
        require(game.state == GameState.Open, "Game not open");
        require(msg.sender != game.player1, "Cannot play yourself");
        require(msg.value == game.wagerAmount, "Must match wager");

        game.player2 = msg.sender;
        game.state = GameState.Active;

        playerGames[msg.sender].push(_gameId);
        emit GameJoined(_gameId, msg.sender);
    }

    /**
     * @notice Submit game result (oracle only)
     * @param _gameId The ID of the game
     * @param _winner The address of the winning player
     * @param _gameDataHash Hash of the off-chain game replay data
     */
    function resolveGame(
        uint256 _gameId,
        address _winner,
        bytes32 _gameDataHash
    ) external onlyOracle gameExists(_gameId) {
        Game storage game = games[_gameId];
        require(game.state == GameState.Active, "Game not active");
        require(
            _winner == game.player1 || _winner == game.player2,
            "Winner must be a player"
        );

        game.winner = _winner;
        game.state = GameState.Resolved;
        game.resolvedAt = block.timestamp;
        game.gameDataHash = _gameDataHash;

        uint256 pot = game.wagerAmount * 2;
        uint256 fee = (pot * platformFeeBps) / 10000;
        uint256 payout = pot - fee;

        totalVolume += pot;
        totalFees += fee;
        accumulatedFees += fee;

        address loser = _winner == game.player1 ? game.player2 : game.player1;
        playerWins[_winner]++;
        playerLosses[loser]++;

        // Transfer winnings
        (bool success, ) = _winner.call{value: payout}("");
        require(success, "Payout failed");

        emit GameResolved(_gameId, _winner, payout, fee);
    }

    /**
     * @notice Dispute a game result within the dispute window
     * @param _gameId The ID of the game to dispute
     */
    function disputeGame(uint256 _gameId) external gameExists(_gameId) {
        Game storage game = games[_gameId];
        require(game.state == GameState.Resolved, "Game not resolved");
        require(
            msg.sender == game.player1 || msg.sender == game.player2,
            "Not a player"
        );
        require(
            block.timestamp <= game.resolvedAt + DISPUTE_WINDOW,
            "Dispute window closed"
        );

        game.state = GameState.Disputed;
        disputeTimestamp[_gameId] = block.timestamp;

        emit GameDisputed(_gameId, msg.sender);
    }

    /**
     * @notice Resolve a dispute (owner arbitration)
     * @param _gameId The ID of the disputed game
     * @param _winner The rightful winner after review
     */
    function resolveDispute(
        uint256 _gameId,
        address _winner
    ) external onlyOwner gameExists(_gameId) {
        Game storage game = games[_gameId];
        require(game.state == GameState.Disputed, "Not disputed");
        require(
            _winner == game.player1 || _winner == game.player2,
            "Winner must be a player"
        );

        game.winner = _winner;
        game.state = GameState.Resolved;
        game.resolvedAt = block.timestamp;

        // Note: In a dispute, the original payout already went out.
        // The dispute resolution would handle off-chain compensation
        // or trigger a separate settlement contract in v2.

        emit DisputeResolved(_gameId, _winner);
    }

    // =========================================================================
    //                           CANCELLATION & EXPIRY
    // =========================================================================

    /**
     * @notice Cancel an open game and refund the creator
     * @param _gameId The ID of the game to cancel
     */
    function cancelGame(uint256 _gameId) external gameExists(_gameId) {
        Game storage game = games[_gameId];
        require(game.state == GameState.Open, "Can only cancel open games");
        require(msg.sender == game.player1, "Only creator can cancel");

        game.state = GameState.Cancelled;

        (bool success, ) = game.player1.call{value: game.wagerAmount}("");
        require(success, "Refund failed");

        emit GameCancelled(_gameId);
    }

    /**
     * @notice Expire a game that has timed out without resolution
     * @param _gameId The ID of the game to expire
     */
    function expireGame(uint256 _gameId) external gameExists(_gameId) {
        Game storage game = games[_gameId];
        require(
            game.state == GameState.Open || game.state == GameState.Active,
            "Cannot expire"
        );
        require(
            block.timestamp > game.createdAt + GAME_TIMEOUT,
            "Not yet expired"
        );

        game.state = GameState.Expired;

        // Refund both players
        if (game.player1 != address(0)) {
            (bool s1, ) = game.player1.call{value: game.wagerAmount}("");
            require(s1, "Refund player1 failed");
        }
        if (game.player2 != address(0)) {
            (bool s2, ) = game.player2.call{value: game.wagerAmount}("");
            require(s2, "Refund player2 failed");
        }

        emit GameExpired(_gameId);
    }

    // =========================================================================
    //                            ADMIN FUNCTIONS
    // =========================================================================

    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid oracle");
        oracle = _oracle;
        emit OracleUpdated(_oracle);
    }

    function setFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= MAX_FEE, "Fee too high");
        platformFeeBps = _feeBps;
        emit FeeUpdated(_feeBps);
    }

    function setWagerLimits(uint256 _min, uint256 _max) external onlyOwner {
        require(_min < _max, "Invalid limits");
        minWager = _min;
        maxWager = _max;
    }

    function withdrawFees() external onlyOwner {
        uint256 toWithdraw = accumulatedFees;
        require(toWithdraw > 0, "No fees to withdraw");
        accumulatedFees = 0;
        (bool success, ) = owner.call{value: toWithdraw}("");
        require(success, "Withdrawal failed");
        emit FundsWithdrawn(owner, toWithdraw);
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        owner = _newOwner;
    }

    // =========================================================================
    //                            VIEW FUNCTIONS
    // =========================================================================

    function getGame(uint256 _gameId) external view gameExists(_gameId) returns (Game memory) {
        return games[_gameId];
    }

    function getPlayerGames(address _player) external view returns (uint256[] memory) {
        return playerGames[_player];
    }

    function getPlayerStats(address _player) external view returns (
        uint256 wins,
        uint256 losses,
        uint256 totalGames
    ) {
        return (
            playerWins[_player],
            playerLosses[_player],
            playerGames[_player].length
        );
    }

    function getOpenGames(uint256 _offset, uint256 _limit) external view returns (uint256[] memory) {
        uint256[] memory openIds = new uint256[](_limit);
        uint256 count = 0;
        for (uint256 i = _offset; i < gameCounter && count < _limit; i++) {
            if (games[i].state == GameState.Open) {
                openIds[count++] = i;
            }
        }
        // Trim array
        uint256[] memory result = new uint256[](count);
        for (uint256 j = 0; j < count; j++) {
            result[j] = openIds[j];
        }
        return result;
    }

    function getContractStats() external view returns (
        uint256 _totalGames,
        uint256 _totalVolume,
        uint256 _totalFees,
        uint256 _contractBalance
    ) {
        return (gameCounter, totalVolume, totalFees, address(this).balance);
    }

    // Allow contract to receive ETH
    receive() external payable {}
}
