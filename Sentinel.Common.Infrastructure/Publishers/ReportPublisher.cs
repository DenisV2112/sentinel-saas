using System.Text;
using System.Text.Json;
using RabbitMQ.Client;
using RabbitMQ.Client.Exceptions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;

namespace Sentinel.Common.Infrastructure.Publishers;

public class ReportPublisher<T> : IReportPublisher<T>, IDisposable where T : IHasScanId
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<ReportPublisher<T>> _logger;
    private IConnection? _connection;
    private IModel? _channel;
    private readonly object _syncRoot = new();
    private readonly string _exchangeName;
    private readonly string _routingKey;
    private readonly JsonSerializerOptions _jsonOptions;
    private readonly ConnectionFactory _factory;
    private bool _disposed = false;

    public ReportPublisher(IConfiguration configuration, ILogger<ReportPublisher<T>> logger)
    {
        _configuration = configuration;
        _logger = logger;

        _exchangeName = configuration["RabbitMQ:Exchange"] ?? "scan.results";
        _routingKey = configuration["RabbitMQ:RoutingKey"] ?? "scan.result.final";

        _factory = new ConnectionFactory
        {
            HostName = configuration["RabbitMQ:HostName"] ?? "localhost",
            Port = configuration.GetValue<int?>("RabbitMQ:Port") ?? 5672,
            UserName = configuration["RabbitMQ:Username"] ?? "guest",
            Password = configuration["RabbitMQ:Password"] ?? "guest",
            DispatchConsumersAsync = false,
            AutomaticRecoveryEnabled = false
        };

        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        };

        // Connection is established lazily on first PublishFinalResultAsync call.
    }

    private async Task<bool> TryEnsureConnectionInternalAsync()
    {
        if (_connection != null && _connection.IsOpen && _channel != null && _channel.IsOpen)
            return true;

        lock (_syncRoot)
        {
            if (_connection != null && _connection.IsOpen && _channel != null && _channel.IsOpen)
                return true;

            var attempt = 0;
            var maxAttempts = 5;
            Exception? lastEx = null;

            while (attempt < maxAttempts)
            {
                attempt++;
                try
                {
                    _logger.LogInformation("RabbitMQ: intentando conectar (intento {Attempt}/{Max})", attempt, maxAttempts);

                    try { _channel?.Close(); }
                    catch (Exception ex) { _logger.LogDebug(ex, "Non-critical: failed to close previous channel during reconnect"); }

                    try { _connection?.Close(); }
                    catch (Exception ex) { _logger.LogDebug(ex, "Non-critical: failed to close previous connection during reconnect"); }

                    _connection = _factory.CreateConnection();
                    _channel = _connection.CreateModel();
                    _channel.ConfirmSelect();
                    _channel.ExchangeDeclare(exchange: _exchangeName, type: ExchangeType.Topic, durable: true, autoDelete: false);

                    _connection.ConnectionShutdown += (s, e) =>
                        _logger.LogWarning("RabbitMQ: conexión cerrada: {Reason}", e.ReplyText);

                    _channel.ModelShutdown += (s, e) =>
                        _logger.LogWarning("RabbitMQ: canal cerrado: {ReplyText}", e.ReplyText);

                    _logger.LogInformation("RabbitMQ: conexión establecida con exchange '{Exchange}'", _exchangeName);
                    lastEx = null;
                    break;
                }
                catch (Exception ex)
                {
                    lastEx = ex;
                    _logger.LogWarning(ex, "RabbitMQ: fallo al conectar en intento {Attempt}", attempt);
                    var delay = Math.Min(2000 * attempt, 10000);
                    Thread.Sleep(delay);
                }
            }

            if (lastEx != null)
            {
                _logger.LogError(lastEx, "RabbitMQ: no fue posible crear la conexión después de {MaxAttempts} intentos", maxAttempts);
                return false;
            }

            return true;
        }
    }

    public async Task PublishFinalResultAsync(T result)
    {
        if (result == null) throw new ArgumentNullException(nameof(result));
        var payload = JsonSerializer.Serialize(result, _jsonOptions);
        var body = Encoding.UTF8.GetBytes(payload);

        var props = _channel?.CreateBasicProperties();
        if (props != null)
        {
            props.DeliveryMode = 2; // persistent
            props.ContentType = "application/json";
            props.Timestamp = new AmqpTimestamp(DateTimeOffset.UtcNow.ToUnixTimeSeconds());
        }

        const int maxPublishAttempts = 3;
        var attempt = 0;
        Exception? lastEx = null;

        while (attempt < maxPublishAttempts)
        {
            attempt++;
            try
            {
                await TryEnsureConnectionInternalAsync();

                if (_channel == null || _channel.IsClosed)
                    throw new InvalidOperationException("RabbitMQ channel is not available.");

                _channel.BasicPublish(exchange: _exchangeName, routingKey: _routingKey, basicProperties: props, body: body);

                var confirmed = _channel.WaitForConfirms(TimeSpan.FromSeconds(5));
                if (!confirmed)
                    throw new Exception("Publisher confirm failed (timeout or nack).");

                _logger.LogInformation("Publicado resultado del scan {ScanId} en exchange '{Exchange}'", result.ScanId, _exchangeName);
                return;
            }
            catch (AlreadyClosedException ace)
            {
                lastEx = ace;
                _logger.LogWarning(ace, "RabbitMQ: canal/conexión cerrada al publicar (intento {Attempt})", attempt);
                InvalidateConnection();
            }
            catch (Exception ex)
            {
                lastEx = ex;
                _logger.LogWarning(ex, "RabbitMQ: error publicando (intento {Attempt})", attempt);
                InvalidateConnection();
            }

            var backoff = 200 * (int)Math.Pow(2, attempt);
            await Task.Delay(backoff);
        }

        _logger.LogError(lastEx, "RabbitMQ: no fue posible publicar el resultado tras {Attempts} intentos", maxPublishAttempts);
        throw new InvalidOperationException("Failed to publish final scan result to RabbitMQ after retries.", lastEx);
    }

    public void InvalidateConnection()
    {
        lock (_syncRoot)
        {
            try { _channel?.Close(); } catch (Exception ex) { _logger.LogDebug(ex, "Non-critical: failed to close channel during invalidation"); }
            try { _connection?.Close(); } catch (Exception ex) { _logger.LogDebug(ex, "Non-critical: failed to close connection during invalidation"); }
            _channel = null;
            _connection = null;
        }
    }

    public void Dispose()
    {
        if (_disposed) return;
        lock (_syncRoot)
        {
            try { _channel?.Close(); } catch (Exception ex) { _logger.LogDebug(ex, "Non-critical: failed to close channel during dispose"); }
            try { _connection?.Close(); } catch (Exception ex) { _logger.LogDebug(ex, "Non-critical: failed to close connection during dispose"); }
            _channel?.Dispose();
            _connection?.Dispose();
            _disposed = true;
        }
    }
}
