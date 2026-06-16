using System;
using System.Threading;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using Sentinel.SecurityGate.Service.Configuration;
using System.Text;
using System.Text.Json;

namespace Sentinel.SecurityGate.Service.Services
{
    public interface IRabbitMqService
    {
        Task PublishScanRequestAsync<T>(T message, string routingKey);
        Task PublishScanResultAsync<T>(T message);
        void StartListeningForResults(Func<string, Task> messageHandler);
        void StartListeningForRequests(Func<string, Task> messageHandler);
        void Dispose();
    }

    public class RabbitMqService : IRabbitMqService, IDisposable
    {
        private readonly ILogger<RabbitMqService> _logger;
        private readonly RabbitMqConfiguration _config;
        private IConnection? _connection;
        private IModel? _channel;
        private readonly SemaphoreSlim _channelLock = new(1, 1);
        private const int MaxRetries = 5;
        private bool _disposed;

        public RabbitMqService(
            ILogger<RabbitMqService> logger,
            RabbitMqConfiguration config)
        {
            _logger = logger;
            _config = config;
            // Lazy init — no connection in constructor.
            // Connection is established on first use with retry + exponential backoff.
        }

        private void EnsureConnected()
        {
            if (_channel?.IsOpen == true) return;

            _channelLock.Wait();
            try
            {
                if (_channel?.IsOpen == true) return; // double-check

                for (int attempt = 1; attempt <= MaxRetries; attempt++)
                {
                    try
                    {
                        InitializeRabbitMq();
                        _logger.LogInformation(
                            "RabbitMQ connected successfully (attempt {Attempt})", attempt);
                        return;
                    }
                    catch (Exception ex) when (attempt < MaxRetries)
                    {
                        var delayMs = (int)Math.Pow(2, attempt) * 1000;
                        _logger.LogWarning(ex,
                            "RabbitMQ connection attempt {Attempt}/{MaxRetries} failed, retrying in {Delay}s...",
                            attempt, MaxRetries, delayMs / 1000);
                        Thread.Sleep(delayMs);
                    }
                }

                // Last attempt — let it throw if it fails
                InitializeRabbitMq();
                _logger.LogInformation("RabbitMQ connected successfully (final attempt)");
            }
            finally
            {
                _channelLock.Release();
            }
        }

        private void InitializeRabbitMq()
        {
            var factory = new ConnectionFactory
            {
                HostName = _config.HostName,
                Port = _config.Port,
                UserName = _config.UserName,
                Password = _config.Password,
                VirtualHost = _config.VirtualHost,
                DispatchConsumersAsync = true
            };

            _connection = factory.CreateConnection();
            _channel = _connection.CreateModel();

            // Declarar exchanges
            _channel.ExchangeDeclare(
                exchange: _config.ScanRequestExchange,
                type: ExchangeType.Topic,
                durable: true,
                autoDelete: false);

            _channel.ExchangeDeclare(
                exchange: _config.ScanResultExchange,
                type: ExchangeType.Topic,
                durable: true,
                autoDelete: false);

            // Declarar queues
            _channel.QueueDeclare(
                queue: _config.ScanRequestQueue,
                durable: true,
                exclusive: false,
                autoDelete: false);

            _channel.QueueDeclare(
                queue: _config.ScanResultQueue,
                durable: true,
                exclusive: false,
                autoDelete: false);

            // Bind queues a exchanges
            _channel.QueueBind(
                queue: _config.ScanRequestQueue,
                exchange: _config.ScanRequestExchange,
                routingKey: "scan.*");

            _channel.QueueBind(
                queue: _config.ScanResultQueue,
                exchange: _config.ScanResultExchange,
                routingKey: "scan.*.*");
        }

        public async Task PublishScanRequestAsync<T>(T message, string routingKey)
        {
            EnsureConnected();
            await _channelLock.WaitAsync();
            try
            {
                var json = JsonSerializer.Serialize(message);
                var body = Encoding.UTF8.GetBytes(json);

                var properties = _channel!.CreateBasicProperties();
                properties.Persistent = true;
                properties.ContentType = "application/json";
                properties.Timestamp = new AmqpTimestamp(DateTimeOffset.UtcNow.ToUnixTimeSeconds());

                _channel.BasicPublish(
                    exchange: _config.ScanRequestExchange,
                    routingKey: routingKey,
                    basicProperties: properties,
                    body: body);

                _logger.LogInformation(
                    "Mensaje publicado en exchange {Exchange} con routing key {RoutingKey}",
                    _config.ScanRequestExchange,
                    routingKey);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al publicar mensaje en RabbitMQ");
                throw;
            }
            finally
            {
                _channelLock.Release();
            }
        }

        public async Task PublishScanResultAsync<T>(T message)
        {
            EnsureConnected();
            await _channelLock.WaitAsync();
            try
            {
                var json = JsonSerializer.Serialize(message);
                var body = Encoding.UTF8.GetBytes(json);

                // Intentar inferir routing key desde el payload JSON
                string routingKey = "scan.unknown.completed";
                try
                {
                    using var doc = JsonDocument.Parse(json);
                    var root = doc.RootElement;
                    if (root.ValueKind == JsonValueKind.Object)
                    {
                        if (root.TryGetProperty("scanType", out var st) && st.ValueKind == JsonValueKind.String)
                        {
                            routingKey = $"scan.{st.GetString()?.ToLower()}.completed";
                        }
                        else if (root.TryGetProperty("type", out var t) && t.ValueKind == JsonValueKind.String)
                        {
                            routingKey = $"scan.{t.GetString()?.ToLower()}.completed";
                        }
                        else if (root.TryGetProperty("tool", out var tool) && tool.ValueKind == JsonValueKind.String)
                        {
                            routingKey = $"scan.{tool.GetString()?.ToLower()}.completed";
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "Failed to infer routing key from payload JSON, using fallback 'scan.unknown.completed'");
                }

                var properties = _channel!.CreateBasicProperties();
                properties.Persistent = true;
                properties.ContentType = "application/json";

                _channel.BasicPublish(
                    exchange: _config.ScanResultExchange,
                    routingKey: routingKey,
                    basicProperties: properties,
                    body: body);

                _logger.LogInformation("Resultado publicado en exchange {Exchange} con routing key {RoutingKey}",
                    _config.ScanResultExchange, routingKey);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al publicar resultado en RabbitMQ");
                throw;
            }
            finally
            {
                _channelLock.Release();
            }
        }

        public void StartListeningForResults(Func<string, Task> messageHandler)
        {
            EnsureConnected();
            try
            {
                var consumer = new AsyncEventingBasicConsumer(_channel);
                
                consumer.Received += async (sender, eventArgs) =>
                {
                    var body = eventArgs.Body.ToArray();
                    var message = Encoding.UTF8.GetString(body);
                    
                    try
                    {
                        _logger.LogInformation("Mensaje recibido de la cola {Queue}", 
                            _config.ScanResultQueue);
                        
                        await messageHandler(message);
                        
                        // Acknowledge el mensaje solo si se procesó correctamente
                        _channel!.BasicAck(eventArgs.DeliveryTag, false);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error procesando mensaje de RabbitMQ");
                        
                        // Reencolar el mensaje si falla
                        _channel!.BasicNack(eventArgs.DeliveryTag, false, true);
                    }
                };

                _channel!.BasicConsume(
                    queue: _config.ScanResultQueue,
                    autoAck: false,
                    consumer: consumer);

                _logger.LogInformation("Escuchando mensajes en la cola {Queue}", 
                    _config.ScanResultQueue);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al iniciar listener de RabbitMQ");
                throw;
            }
        }

        public void StartListeningForRequests(Func<string, Task> messageHandler)
        {
            EnsureConnected();
            try
            {
                var consumer = new AsyncEventingBasicConsumer(_channel);

                consumer.Received += async (sender, eventArgs) =>
                {
                    var body = eventArgs.Body.ToArray();
                    var message = Encoding.UTF8.GetString(body);

                    try
                    {
                        _logger.LogInformation("Solicitud de escaneo recibida en la cola {Queue}", _config.ScanRequestQueue);

                        await messageHandler(message);

                        _channel!.BasicAck(eventArgs.DeliveryTag, false);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error procesando solicitud de escaneo");
                        _channel!.BasicNack(eventArgs.DeliveryTag, false, true);
                    }
                };

                _channel!.BasicConsume(
                    queue: _config.ScanRequestQueue,
                    autoAck: false,
                    consumer: consumer);

                _logger.LogInformation("Escuchando solicitudes de escaneo en la cola {Queue}", _config.ScanRequestQueue);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al iniciar listener de solicitudes");
                throw;
            }
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;

            try { _channel?.Close(); } catch { }
            try { _connection?.Close(); } catch { }
            _channel?.Dispose();
            _connection?.Dispose();
            _channelLock?.Dispose();
        }
    }
}