using Microsoft.AspNetCore.Mvc;
using Sentinel.Common.Infrastructure.Services;
using Sentinel.SecurityGate.Service.Dtos;
using Sentinel.SecurityGate.Service.Services;

namespace Sentinel.SecurityGate.Service.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ScanController : ControllerBase
    {
        private readonly ILogger<ScanController> _logger;
        private readonly HttpScanOrchestrator _orchestrator;
        private readonly IRabbitMqService _rabbitMqService;
        private readonly IConfiguration _configuration;

        public ScanController(
            ILogger<ScanController> logger,
            HttpScanOrchestrator orchestrator,
            IRabbitMqService rabbitMqService,
            IConfiguration configuration)
        {
            _logger = logger;
            _orchestrator = orchestrator;
            _rabbitMqService = rabbitMqService;
            _configuration = configuration;
        }

        /// <summary>
        /// Endpoint para solicitar un nuevo escaneo
        /// </summary>
        [HttpPost("request")]
        [ProducesResponseType(typeof(ScanAcceptanceDto), StatusCodes.Status202Accepted)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> RequestScan([FromBody] ScanCommandDto command)
        {
            try
            {
                // Validar campos obligatorios según tipo de escaneo
                var validationError = ValidateScanCommand(command);
                if (validationError != null)
                {
                    return BadRequest(new { error = validationError });
                }

                var target = command.ScanType.ToUpperInvariant() switch
                {
                    "SAST" or "FULL_SAST" => command.RepositoryUrl,
                    "DAST" or "DAST_BASIC" => command.TargetUrl,
                    _ => command.RepositoryUrl ?? command.TargetUrl
                };

                _logger.LogInformation(
                    "Solicitud de escaneo recibida: {ScanType} para {Target}",
                    command.ScanType,
                    target);

                // Generar ScanId si no viene
                if (command.ScanId == Guid.Empty)
                {
                    command.ScanId = Guid.NewGuid();
                }

                // Iniciar workflow en n8n
                var scanId = await _orchestrator.StartScanWorkflowAsync(command);

                // Publicar en RabbitMQ para que otros servicios lo procesen
                var routingKey = GetRoutingKeyForScanType(command.ScanType);
                await _rabbitMqService.PublishScanRequestAsync(command, routingKey);

                // Responder inmediatamente con aceptación
                var acceptance = new ScanAcceptanceDto
                {
                    ScanId = scanId,
                    Status = "ACCEPTED",
                    RequestedService = command.ScanType,
                    AcceptanceTimestampUtc = DateTime.UtcNow,
                    CompletionMethod = "RABBITMQ_EVENT"
                };

                return AcceptedAtAction(
                    nameof(GetScanStatus),
                    new { scanId },
                    acceptance);
            }
            catch (ArgumentException ax)
            {
                _logger.LogWarning(ax, "Validación de solicitud de escaneo falló");
                return BadRequest(new { error = ax.Message });
            }
            catch (Exception ex)
            {
                // ponytail: no leak ex.Message — log full detail server-side, return generic to client
                _logger.LogError(ex, "Error procesando solicitud de escaneo");
                return StatusCode(500, new { error = "Error interno procesando la solicitud" });
            }
        }

        /// <summary>
        /// Endpoint para consultar el estado de un escaneo.
        /// ponytail: no implementado — el estado se publica via RabbitMQ y el Results Aggregator lo persiste.
        /// Consultar /api/results/{scanId} en vez de este endpoint.
        /// </summary>
        [HttpGet("{scanId}/status")]
        [ProducesResponseType(StatusCodes.Status501NotImplemented)]
        public IActionResult GetScanStatus(Guid scanId)
        {
            // ponytail: antes devolvía mock con datos falsos. Estado real vive en Results Aggregator.
            return StatusCode(501, new
            {
                error = "Use /api/results/{scanId} en Results Aggregator para estado real",
                scanId
            });
        }

        /// <summary>
        /// Endpoint webhook para recibir resultados de n8n. Protegido con shared-secret.
        /// </summary>
        [HttpPost("webhook/result")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> ReceiveScanResult([FromBody] object scanResult)
        {
            // ponytail: shared-secret via X-Webhook-Secret header
            if (!WebhookAuth.IsValid(_configuration, Request.Headers))
            {
                _logger.LogWarning("Webhook rechazado — X-Webhook-Secret inválido o ausente");
                return Unauthorized();
            }

            try
            {
                _logger.LogInformation("Resultado de escaneo recibido desde n8n");

                await _rabbitMqService.PublishScanResultAsync(scanResult);

                return Ok(new { message = "Resultado recibido y procesado" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error procesando resultado de escaneo");
                return StatusCode(500, new { error = "Error interno procesando resultado" });
            }
        }

        /// <summary>
        /// Valida que el comando tenga todos los campos obligatorios según el tipo de escaneo
        /// </summary>
        private string? ValidateScanCommand(ScanCommandDto command)
        {
            switch (command.ScanType.ToUpperInvariant())
            {
                case "SAST":
                case "FULL_SAST":
                    if (string.IsNullOrWhiteSpace(command.RepositoryUrl))
                        return "El campo 'RepositoryUrl' es obligatorio para escaneos SAST";
                    if (string.IsNullOrWhiteSpace(command.Branch))
                        return "El campo 'Branch' es obligatorio para escaneos SAST";
                    break;

                case "DAST":
                case "DAST_BASIC":
                    if (string.IsNullOrWhiteSpace(command.TargetUrl))
                        return "El campo 'TargetUrl' es obligatorio para escaneos DAST";
                    break;
            }

            return null;
        }

        private string GetRoutingKeyForScanType(string scanType)
        {
            return scanType.ToUpperInvariant() switch
            {
                "FULL_SAST" or "SAST" => "scan.sast",
                "DAST_BASIC" or "DAST" => "scan.dast",
                "PORTS_SCAN" => "scan.ports",
                "SECRETS_SCAN" => "scan.secrets",
                _ => $"scan.{scanType.ToLower()}"
            };
        }
    }
}