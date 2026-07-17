namespace Sentinel.SecurityGate.Service.Configuration
{
    public class RabbitMqConfiguration
    {
        public string HostName { get; set; } = "localhost";
        public int Port { get; set; } = 5672;
        public string UserName { get; set; } = "guest";
        public string Password { get; set; } = "guest";
        public string VirtualHost { get; set; } = "/";
        
        // Exchanges
        public string ScanRequestExchange { get; set; } = "sentinel.scan.requests";
        public string ScanResultExchange { get; set; } = "sentinel.scan.results";
        
        // Queues
        public string ScanRequestQueue { get; set; } = "sentinel.scan.requests.queue";
        public string ScanResultQueue { get; set; } = "sentinel.scan.results.queue";
    }
}