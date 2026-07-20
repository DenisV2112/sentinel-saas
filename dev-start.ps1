# Sentinel Dev — Arranca infraestructura mínima para testing local
# Uso: .\dev-start.ps1          -> postgres + rabbitmq (~300MB)
#      .\dev-start.ps1 full      -> + mongodb (~500MB total)

param([string]$Profile = "")

$composeArgs = @("-f", "docker-compose.dev.yml", "up", "-d")

if ($Profile -eq "full") {
    $composeArgs += "--profile", "full"
    Write-Host "Arrancando postgres + rabbitmq + mongodb..." -ForegroundColor Cyan
} else {
    Write-Host "Arrancando postgres + rabbitmq (mongodb omitido, usa -Profile full si lo necesitas)..." -ForegroundColor Cyan
}

docker compose @composeArgs

Write-Host ""
Write-Host "Esperando health checks..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

docker ps --filter "name=sentinel-dev" --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}"

Write-Host ""
Write-Host "Infra lista. Puertos:" -ForegroundColor Green
Write-Host "  Postgres:  localhost:5432 (sentinel / sentinel123 / sentinel_db)"
Write-Host "  RabbitMQ:  localhost:5672 (amqp), localhost:15672 (dashboard)"
if ($Profile -eq "full") {
    Write-Host "  MongoDB:   localhost:27017 (sentinel / sentinel123)"
}
Write-Host ""
Write-Host "Para correr un servicio Java:" -ForegroundColor Yellow
Write-Host "  cd auth-service-java; `
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/sentinel_db `
SPRING_DATASOURCE_USERNAME=sentinel `
SPRING_DATASOURCE_PASSWORD=sentinel123 `
SPRING_RABBITMQ_HOST=localhost `
mvn spring-boot:run"
Write-Host ""
Write-Host "Para correr el frontend (sin Kong, directo al BFF):" -ForegroundColor Yellow
Write-Host "  cd sentinel_front; VITE_API_URL=http://localhost:8080 npm run dev"
