using System.Numerics;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace CardSharkie.Oracle.Services;

/// <summary>
/// Minimal HTTP API that the game server calls when a game ends.
/// POST /resolve { gameId, winnerAddress, gameData }
/// </summary>
public class OracleApiService : BackgroundService
{
    private readonly ILogger<OracleApiService> _logger;
    private readonly EscrowService _escrow;

    public OracleApiService(EscrowService escrow, ILogger<OracleApiService> logger)
    {
        _escrow = escrow;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseUrls("http://localhost:5100");
        var app = builder.Build();

        app.MapPost("/resolve", async (ResolveRequest request) =>
        {
            if (request.GameId < 0)
                return Results.BadRequest(new { error = "Invalid game ID" });
            if (string.IsNullOrWhiteSpace(request.WinnerAddress) ||
                !System.Text.RegularExpressions.Regex.IsMatch(request.WinnerAddress, @"^0x[a-fA-F0-9]{40}$"))
                return Results.BadRequest(new { error = "Invalid winner address" });
            if (string.IsNullOrWhiteSpace(request.GameData))
                return Results.BadRequest(new { error = "Game data required" });

            try
            {
                var txHash = await _escrow.ResolveGameAsync(
                    new BigInteger(request.GameId),
                    request.WinnerAddress,
                    request.GameData);

                _logger.LogInformation("Resolved game {GameId} — tx: {TxHash}", request.GameId, txHash);
                return Results.Ok(new { txHash, gameId = request.GameId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to resolve game {GameId}", request.GameId);
                return Results.StatusCode(500);
            }
        });

        app.MapGet("/health", async () =>
        {
            var balance = await _escrow.GetBalanceAsync();
            var status = balance > 0.0001m ? "ok" : "low_balance";
            return Results.Ok(new { status, oracleBalance = $"{balance:F6} ETH" });
        });

        _logger.LogInformation("Oracle API listening on http://localhost:5100");
        await app.RunAsync(stoppingToken);
    }
}

public record ResolveRequest(long GameId, string WinnerAddress, string GameData);
