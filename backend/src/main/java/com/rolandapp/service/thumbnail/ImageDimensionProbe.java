package com.rolandapp.service.thumbnail;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.nio.file.Path;
import java.util.Optional;

/**
 * Leest de werkelijke pixel-dimensies van een gedownload bestand, zonder
 * de volledige afbeelding te decoderen (alleen de header via ImageIO).
 * De runtime-container draait op eclipse-temurin:21-jre (volledige JRE,
 * inclusief java.desktop), dus ImageIO is headless beschikbaar.
 *
 * <p>Bestaat omdat bronnen kunnen liegen over hun resolutie: de
 * "HD"-site-images bleken 180-320px, en MIMO's og:image is soms maar
 * 768px. De resolvers schrijven daarom de gemeten breedte/hoogte naar de
 * database in plaats van de aangevraagde {@code desiredWidth}.
 *
 * <p>Geeft {@code empty} voor formaten zonder ImageIO-reader (SVG, WebP);
 * de caller valt dan terug op de dimensies die de bron zelf opgaf.
 */
public final class ImageDimensionProbe {

    private ImageDimensionProbe() {
    }

    public record Dimensions(int width, int height) {}

    public static Optional<Dimensions> probe(Path file) {
        try (ImageInputStream in = ImageIO.createImageInputStream(file.toFile())) {
            if (in == null) return Optional.empty();
            var readers = ImageIO.getImageReaders(in);
            if (!readers.hasNext()) return Optional.empty();
            ImageReader reader = readers.next();
            try {
                reader.setInput(in, true, true);
                return Optional.of(new Dimensions(reader.getWidth(0), reader.getHeight(0)));
            } finally {
                reader.dispose();
            }
        } catch (Exception e) {
            return Optional.empty();
        }
    }
}
