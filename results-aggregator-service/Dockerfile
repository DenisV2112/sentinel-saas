FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /build

COPY . .

RUN mvn clean package -DskipTests -q

FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

RUN apk add --no-cache curl

COPY --from=builder /build/target/*.jar app.jar

EXPOSE 8087

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8087/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
