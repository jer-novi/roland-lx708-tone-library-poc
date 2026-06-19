package com.rolandapp.controller;

import com.rolandapp.service.HsTreeService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Endpoints rond de Hornbostel-Sachs taxonomie-tree. De tree is
 * statisch (geparsed door scripts/parse_hs_tree.py in Fase 1.1) en
 * zit in de classpath; we serveren 'm direct zonder transformatie.
 */
@RestController
public class HsTreeController {

    private final HsTreeService hsTreeService;

    public HsTreeController(HsTreeService hsTreeService) {
        this.hsTreeService = hsTreeService;
    }

    /**
     * Volledige HS-tree (5 families, 11+2 sub-families, 350 instruments).
     * De frontend gebruikt dit voor de "Bekijk hele taxonomy"-knop in
     * het detail-venster; het is ~265KB dus we laten de browser 'm
     * eenmaal cachen via standaard Cache-Control.
     */
    @GetMapping("/api/hs-tree")
    public Map<String, Object> getFullTree() {
        var src = hsTreeService.getFullTree();
        return Map.of(
                "source", src.path("source").asText(""),
                "scraped_at", src.path("scraped_at").asText(""),
                "stats", src.path("stats"),
                "families", src.path("families"),
                "all_instruments", src.path("all_instruments")
        );
    }
}
