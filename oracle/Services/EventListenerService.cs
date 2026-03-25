using System.Numerics;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Nethereum.Web3;
using Nethereum.Contracts;
using Nethereum.Hex.HexTypes;
using Nethereum.RPC.Eth.DTOs;

namespace CardSharkie.Oracle.Services;

/// <summary>
/// Background service that polls the contract for new events.
/// Logs GameCreated, GameJoined, and GameResolved events in real time.
/// </summary>
public class EventListenerService : BackgroundService
{
    private readonly ILogger<EventListenerService> _logger;
    private readonly Web3 _web3;
    private readonly string _contractAddress;
    private BigInteger _lastBlock;

    public EventListenerService(
        IOptions<EscrowSettings> settings,
        ILogger<EventListenerService> logger)
    {
        _logger = logger;
        var config = settings.Value;
        _contractAddress = config.ContractAddress;
        _web3 = new Web3(config.RpcUrl);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Event listener starting for contract {Address}", _contractAddress);

        // Start from current block
        var currentBlock = await _web3.Eth.Blocks.GetBlockNumber.SendRequestAsync();
        _lastBlock = currentBlock.Value;
        _logger.LogInformation("Listening from block {Block}", _lastBlock);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var latestBlock = await _web3.Eth.Blocks.GetBlockNumber.SendRequestAsync();

                if (latestBlock.Value > _lastBlock)
                {
                    var fromBlock = new BlockParameter(new HexBigInteger(_lastBlock + 1));
                    var toBlock = new BlockParameter(latestBlock);

                    // Poll for GameCreated events
                    var createdHandler = _web3.Eth.GetEvent<GameCreatedEventDTO>(_contractAddress);
                    var createdFilter = createdHandler.CreateFilterInput(fromBlock, toBlock);
                    var createdEvents = await createdHandler.GetAllChangesAsync(createdFilter);

                    foreach (var evt in createdEvents)
                    {
                        _logger.LogInformation(
                            "[GameCreated] ID: {GameId} | Player: {Player} | Wager: {Wager} ETH | Type: {Type}",
                            evt.Event.GameId,
                            evt.Event.Player1,
                            Web3.Convert.FromWei(evt.Event.WagerAmount),
                            evt.Event.GameType);
                    }

                    // Poll for GameJoined events
                    var joinedHandler = _web3.Eth.GetEvent<GameJoinedEventDTO>(_contractAddress);
                    var joinedFilter = joinedHandler.CreateFilterInput(fromBlock, toBlock);
                    var joinedEvents = await joinedHandler.GetAllChangesAsync(joinedFilter);

                    foreach (var evt in joinedEvents)
                    {
                        _logger.LogInformation(
                            "[GameJoined] ID: {GameId} | Player2: {Player2} — READY TO PLAY",
                            evt.Event.GameId,
                            evt.Event.Player2);
                    }

                    // Poll for GameResolved events
                    var resolvedHandler = _web3.Eth.GetEvent<GameResolvedEventDTO>(_contractAddress);
                    var resolvedFilter = resolvedHandler.CreateFilterInput(fromBlock, toBlock);
                    var resolvedEvents = await resolvedHandler.GetAllChangesAsync(resolvedFilter);

                    foreach (var evt in resolvedEvents)
                    {
                        _logger.LogInformation(
                            "[GameResolved] ID: {GameId} | Winner: {Winner} | Payout: {Payout} ETH | Fee: {Fee} ETH",
                            evt.Event.GameId,
                            evt.Event.Winner,
                            Web3.Convert.FromWei(evt.Event.Payout),
                            Web3.Convert.FromWei(evt.Event.Fee));
                    }

                    _lastBlock = latestBlock.Value;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Event polling error");
            }

            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
    }
}
