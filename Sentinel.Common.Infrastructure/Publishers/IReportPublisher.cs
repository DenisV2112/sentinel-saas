namespace Sentinel.Common.Infrastructure.Publishers;

public interface IReportPublisher<T> where T : IHasScanId
{
    Task<bool> TryEnsureConnectionAsync();
    Task PublishFinalResultAsync(T result);
    void InvalidateConnection();
}
