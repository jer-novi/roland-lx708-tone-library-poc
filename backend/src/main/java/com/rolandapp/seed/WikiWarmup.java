package com.rolandapp.seed;

import com.rolandapp.service.WikiService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Vult bij het opstarten de wiki-cache (samenvatting, HTML, thumbnail) voor
 * tones die nog geen opgeslagen wiki-data hebben, op een achtergrondthread.
 * Zo verschijnen kaart-thumbnails voor iedereen zonder dat een bezoeker eerst
 * elke tone-modal hoeft te openen. Non-blocking: de API is direct beschikbaar,
 * de cache vult zich met de ingestelde rate-limit (bulk-delay-ms per pagina).
 */
@Component
@ConditionalOnProperty(name = "app.wikipedia.warmup-enabled", havingValue = "true", matchIfMissing = true)
@Order(2) // na DataInitializer: de tones moeten eerst geseed zijn
public class WikiWarmup implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(WikiWarmup.class);

    private final WikiService wikiService;

    public WikiWarmup(WikiService wikiService) {
        this.wikiService = wikiService;
    }

    @Override
    public void run(String... args) {
        int missing = wikiService.findMissingToneIds().size();
        if (missing == 0) {
            log.info("Wiki-warmup: cache is al compleet");
            return;
        }
        Thread warmup = new Thread(() -> {
            log.info("Wiki-warmup gestart voor {} tones zonder wiki-data", missing);
            wikiService.refreshMissing();
        }, "wiki-warmup");
        warmup.setDaemon(true);
        warmup.start();
    }
}
