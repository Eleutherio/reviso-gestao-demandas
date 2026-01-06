 # syntax=docker/dockerfile:1.4

FROM eclipse-temurin:21-jdk-alpine AS build

WORKDIR /app

COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Baixa dependências usando cache de ~/.m2 para evitar download em todo build
RUN --mount=type=cache,target=/root/.m2 ./mvnw -B -ntp dependency:go-offline

COPY src src

# Build application (cache de ~/.m2 reaproveitado)
RUN --mount=type=cache,target=/root/.m2 ./mvnw -B -ntp clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
