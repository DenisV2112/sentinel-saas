FROM mcr.microsoft.com/dotnet/sdk:8.0 AS builder

WORKDIR /build

COPY . .

RUN dotnet publish -c Release -o out

FROM mcr.microsoft.com/dotnet/aspnet:8.0

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /build/out .

ENV ASPNETCORE_URLS=http://+:5001
EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:5001/health || exit 1

ENTRYPOINT ["dotnet", "Sentinel.CodeQuality.Service.dll"]
