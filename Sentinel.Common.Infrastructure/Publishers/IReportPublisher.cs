namespace Sentinel.Common.Infrastructure.Publishers;

public interface IReportPublisher<T> where T : IHasScanId
{
    Task PublishFinalResultAsync(T result);
    void InvalidateConnection();
}
