using CardSharkie.Oracle.Services;

var builder = Host.CreateApplicationBuilder(args);

// Bind config from appsettings.json -> "Escrow" section
builder.Services.Configure<EscrowSettings>(
    builder.Configuration.GetSection("Escrow"));

// Register services
builder.Services.AddSingleton<EscrowService>();
builder.Services.AddHostedService<EventListenerService>();
builder.Services.AddHostedService<OracleApiService>();

var host = builder.Build();
host.Run();
