# ---- build stage -------------------------------------------------------------
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

# ---- runtime stage -----------------------------------------------------------
FROM eclipse-temurin:17-jre
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Detectra v3 AI-image detector (MIT licence, ~43 MB). It is not stored in git, so it is fetched and verified at build time.
RUN mkdir -p models/detectra-v3 uploads/portfolio \
 && curl -fsSL -o models/detectra-v3/model.onnx https://huggingface.co/TensorFold/detectra-v1/resolve/main/model.onnx \
 && echo "1414b9aafaa01a644ed706224973f09b53a1388282104409862df9893b1b962b  models/detectra-v3/model.onnx" | sha256sum -c -

COPY --from=build /build/target/glamhub-backend-1.0.0.jar app.jar

# Small heap so the service fits a 512 MB instance; the ONNX runtime uses native memory outside the heap.
ENV JAVA_TOOL_OPTIONS="-Xmx256m -XX:+UseSerialGC -XX:MaxMetaspaceSize=128m -Xss512k -Djava.awt.headless=true"
# Render injects PORT; the app reads it (see application.yml).
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
