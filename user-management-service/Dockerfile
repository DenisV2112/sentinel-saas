FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /build

# Install shared security module to local Maven repo
COPY sentinel-common-security /build/sentinel-common-security
RUN mvn -f sentinel-common-security/pom.xml install -DskipTests -q

# Build this service
ARG CACHE_BUST=1
COPY user-management-service /build
RUN mvn clean package -DskipTests -q

FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

RUN apk add --no-cache curl

COPY --from=builder /build/target/*.jar app.jar

EXPOSE 8088

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8083/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
