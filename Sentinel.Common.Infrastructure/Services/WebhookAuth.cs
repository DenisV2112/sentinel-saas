using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace Sentinel.Common.Infrastructure.Services;

/// <summary>
/// Ponytail shared-secret validator for n8n webhook endpoints.
/// Reads N8N_WEBHOOK_SECRET from config (env var in prod).
/// Fails closed: if unset or header missing, returns false.
/// </summary>
public static class WebhookAuth
{
    public const string HeaderName = "X-Webhook-Secret";

    public static bool IsValid(IConfiguration config, IHeaderDictionary headers)
    {
        var secret = config["N8N_WEBHOOK_SECRET"];
        // ponytail: fail closed — no secret configured = reject all webhooks
        if (string.IsNullOrEmpty(secret)) return false;
        return headers.TryGetValue(HeaderName, out var sent)
            && string.Equals(sent, secret, StringComparison.Ordinal);
    }
}