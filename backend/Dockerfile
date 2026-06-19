# Build stage
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
# Cache dependencies in their own layer so code changes rebuild fast
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q package -DskipTests

# Run stage
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# Bundel de lokale instrument-images (gegenereerd door
# scripts/download_instrument_images.py, ~1MB totaal) zodat ze offline
# beschikbaar zijn in de runtime. Ze staan ook in de classpath
# (src/main/resources/data/instrument-images), maar we kopiëren ze
# expliciet naar /app/data zodat LocalFileThumbnailSource ze kan vinden
# via de geconfigureerde local-images-dir.
COPY src/main/resources/data/instrument-images /app/data/instrument-images
# Bundel de MIMO-fallback mapping (gegenereerd door scripts/scrape_mimo.py,
# ~50KB) zodat MimoImageThumbnailSource offline kan werken. De bron ligt
# in src/main/resources/data (gesynced vanuit de repo-root data/ map).
COPY src/main/resources/data/mimo_image_references.json /app/data/mimo_image_references.json
# Bundel de HS-tree (~270KB) voor de /api/hs-tree en /api/tones/{id}/hs-path
# endpoints. Idem, gesynced vanuit repo-root data/ naar resources/data/.
# Wordt ook via de classpath ingeladen door HsTreeService, dus dubbele
# opslag; we laten 'm staan voor de toekomstige "export all data"-tools.
COPY src/main/resources/data/horn_bostel_sachs_tree.json /app/data/horn_bostel_sachs_tree.json
# Bundel de statische emoji-iconen (SVG, gegenereerd door
# scripts/generate_static_icons.py) voor tonen zonder enige foto-bron.
COPY src/main/resources/data/static-icons /app/data/static-icons
# Render free tier has 512MB RAM; cap the JVM well below that
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
