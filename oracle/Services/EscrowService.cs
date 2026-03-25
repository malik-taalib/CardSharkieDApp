using System.Numerics;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Nethereum.Web3;
using Nethereum.Web3.Accounts;
using Nethereum.Contracts;
using Nethereum.Hex.HexTypes;
using Nethereum.ABI.FunctionEncoding.Attributes;

namespace CardSharkie.Oracle.Services;

public class EscrowSettings
{
    public string RpcUrl { get; set; } = "https://sepolia.base.org";
    public string ContractAddress { get; set; } = "0x1eAf6CFdBAA561006D0059E3dDa7a01f18730F33";
    public string OraclePrivateKey { get; set; } = "";
    public int ChainId { get; set; } = 84532; // Base Sepolia
}

// Contract function definitions
[Function("resolveGame")]
public class ResolveGameFunction : FunctionMessage
{
    [Parameter("uint256", "_gameId", 1)]
    public BigInteger GameId { get; set; }

    [Parameter("address", "_winner", 2)]
    public string Winner { get; set; } = "";

    [Parameter("bytes32", "_gameDataHash", 3)]
    public byte[] GameDataHash { get; set; } = new byte[32];
}

[Function("getGame", typeof(GetGameOutputDTO))]
public class GetGameFunction : FunctionMessage
{
    [Parameter("uint256", "_gameId", 1)]
    public BigInteger GameId { get; set; }
}

[FunctionOutput]
public class GetGameOutputDTO : IFunctionOutputDTO
{
    [Parameter("tuple", "", 1)]
    public GameDTO Game { get; set; } = new();
}

public class GameDTO
{
    [Parameter("address", "player1", 1)]
    public string Player1 { get; set; } = "";

    [Parameter("address", "player2", 2)]
    public string Player2 { get; set; } = "";

    [Parameter("uint256", "wagerAmount", 3)]
    public BigInteger WagerAmount { get; set; }

    [Parameter("uint256", "createdAt", 4)]
    public BigInteger CreatedAt { get; set; }

    [Parameter("uint256", "resolvedAt", 5)]
    public BigInteger ResolvedAt { get; set; }

    [Parameter("uint8", "state", 6)]
    public int State { get; set; }

    [Parameter("address", "winner", 7)]
    public string Winner { get; set; } = "";

    [Parameter("string", "gameType", 8)]
    public string GameType { get; set; } = "";

    [Parameter("bytes32", "gameDataHash", 9)]
    public byte[] GameDataHash { get; set; } = new byte[32];
}

// Event definitions for listening
[Event("GameCreated")]
public class GameCreatedEventDTO : IEventDTO
{
    [Parameter("uint256", "gameId", 1, true)]
    public BigInteger GameId { get; set; }

    [Parameter("address", "player1", 2, true)]
    public string Player1 { get; set; } = "";

    [Parameter("uint256", "wagerAmount", 3)]
    public BigInteger WagerAmount { get; set; }

    [Parameter("string", "gameType", 4)]
    public string GameType { get; set; } = "";
}

[Event("GameJoined")]
public class GameJoinedEventDTO : IEventDTO
{
    [Parameter("uint256", "gameId", 1, true)]
    public BigInteger GameId { get; set; }

    [Parameter("address", "player2", 2, true)]
    public string Player2 { get; set; } = "";
}

[Event("GameResolved")]
public class GameResolvedEventDTO : IEventDTO
{
    [Parameter("uint256", "gameId", 1, true)]
    public BigInteger GameId { get; set; }

    [Parameter("address", "winner", 2, true)]
    public string Winner { get; set; } = "";

    [Parameter("uint256", "payout", 3)]
    public BigInteger Payout { get; set; }

    [Parameter("uint256", "fee", 4)]
    public BigInteger Fee { get; set; }
}

public class EscrowService
{
    private readonly Web3 _web3;
    private readonly string _contractAddress;
    private readonly ILogger<EscrowService> _logger;

    public EscrowService(IOptions<EscrowSettings> settings, ILogger<EscrowService> logger)
    {
        _logger = logger;
        var config = settings.Value;
        _contractAddress = config.ContractAddress;

        var account = new Account(config.OraclePrivateKey, config.ChainId);
        _web3 = new Web3(account, config.RpcUrl);

        _logger.LogInformation("Oracle initialized: {Address} on chain {ChainId}",
            account.Address, config.ChainId);
    }

    /// <summary>
    /// Resolve a game on-chain, paying out the winner.
    /// Called by the game server when a game ends.
    /// </summary>
    public async Task<string> ResolveGameAsync(BigInteger gameId, string winnerAddress, string gameData)
    {
        _logger.LogInformation("Resolving game {GameId} — winner: {Winner}", gameId, winnerAddress);

        // Hash the game replay data for on-chain verification
        var gameDataHash = Web3.Sha3(gameData);
        var hashBytes = Nethereum.Hex.HexConvertors.Extensions.HexByteConvertorExtensions
            .HexToByteArray(gameDataHash);

        var resolveFunction = new ResolveGameFunction
        {
            GameId = gameId,
            Winner = winnerAddress,
            GameDataHash = hashBytes
        };

        var handler = _web3.Eth.GetContractTransactionHandler<ResolveGameFunction>();

        try
        {
            // Estimate gas first
            var gas = await handler.EstimateGasAsync(_contractAddress, resolveFunction);
            resolveFunction.Gas = gas.Value + 10000; // add buffer

            var receipt = await handler.SendRequestAndWaitForReceiptAsync(_contractAddress, resolveFunction);

            _logger.LogInformation(
                "Game {GameId} resolved! TxHash: {TxHash} | Gas: {Gas} | Block: {Block}",
                gameId, receipt.TransactionHash, receipt.GasUsed.Value, receipt.BlockNumber.Value);

            return receipt.TransactionHash;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to resolve game {GameId}", gameId);
            throw;
        }
    }

    /// <summary>
    /// Read game state from the contract.
    /// </summary>
    public async Task<GameDTO?> GetGameAsync(BigInteger gameId)
    {
        var getGameFunction = new GetGameFunction { GameId = gameId };
        var handler = _web3.Eth.GetContractQueryHandler<GetGameFunction>();

        try
        {
            var result = await handler.QueryDeserializingToObjectAsync<GetGameOutputDTO>(
                getGameFunction, _contractAddress);
            return result.Game;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to read game {GameId}", gameId);
            return null;
        }
    }

    /// <summary>
    /// Get the oracle wallet's ETH balance.
    /// </summary>
    public async Task<decimal> GetBalanceAsync()
    {
        var balance = await _web3.Eth.GetBalance.SendRequestAsync(
            _web3.TransactionManager.Account.Address);
        return Web3.Convert.FromWei(balance.Value);
    }
}
