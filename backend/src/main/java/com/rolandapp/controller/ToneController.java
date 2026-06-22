package com.rolandapp.controller;

import com.rolandapp.dto.ToneCategoryDto;
import com.rolandapp.dto.ToneDetailDto;
import com.rolandapp.dto.ToneDto;
import com.rolandapp.dto.WarmupStatusDto;
import com.rolandapp.dto.WikiDataDto;
import com.rolandapp.exception.NotFoundException;
import com.rolandapp.model.Tone;
import com.rolandapp.repository.ToneRepository;
import com.rolandapp.service.HsTreeService;
import com.rolandapp.service.RolandHsMappingService;
import com.rolandapp.service.ToneService;
import com.rolandapp.service.WikiService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ToneController {

    private final ToneService toneService;
    private final WikiService wikiService;
    private final ToneRepository toneRepository;
    private final RolandHsMappingService rolandHsMappingService;
    private final HsTreeService hsTreeService;

    public ToneController(ToneService toneService,
                          WikiService wikiService,
                          ToneRepository toneRepository,
                          RolandHsMappingService rolandHsMappingService,
                          HsTreeService hsTreeService) {
        this.toneService = toneService;
        this.wikiService = wikiService;
        this.toneRepository = toneRepository;
        this.rolandHsMappingService = rolandHsMappingService;
        this.hsTreeService = hsTreeService;
    }

    @GetMapping("/categories")
    public List<ToneCategoryDto> getCategories() {
        return toneService.getCategories();
    }

    @GetMapping("/tones/sub-categories")
    public List<String> getSubCategories() {
        return toneService.getSubCategories();
    }

    @GetMapping("/tones")
    public List<ToneDto> getTones(@RequestParam(required = false) String category,
                                  @RequestParam(required = false) String subCategory,
                                  @RequestParam(required = false) String q,
                                  @RequestParam(defaultValue = "nl") String lang) {
        return toneService.search(category, subCategory, q, lang);
    }

    @GetMapping("/tones/{id}")
    public ToneDetailDto getTone(@PathVariable Long id,
                                 @RequestParam(defaultValue = "nl") String lang) {
        return toneService.getDetail(id, lang);
    }

    @GetMapping("/tones/{id}/wiki")
    public WikiDataDto getWiki(@PathVariable Long id,
                               @RequestParam(defaultValue = "false") boolean refresh) {
        return wikiService.getWikiData(id, refresh);
    }

    /**
     * HS-taxonomy pad voor deze tone: van root-family tot leaf-level
     * instrument. Bijv. voor "European Grand" piano:
     * <pre>
     *   { "category": "Piano", "categoryName": "Chordophones",
     *     "subcategory": "Composite chordophones",
     *     "instrument": "Pianoforte",
     *     "path": [
     *       {"code":"3","name":"Chordophones",...},
     *       {"code":"32","name":"Composite chordophones",...},
     *       {"code":"321.322","name":"Pianoforte",...}
     *     ] }
     * </pre>
     */
    @GetMapping("/tones/{id}/hs-path")
    public Map<String, Object> getHsPath(@PathVariable Long id) {
        Tone tone = toneRepository.findByIdWithCategory(id)
                .orElseThrow(() -> new NotFoundException("Tone " + id + " not found"));
        var firstPath = rolandHsMappingService.firstHsPath(
                tone.getCategory().getName(), tone.getToneNumber());
        if (firstPath.isEmpty()) {
            return Map.of(
                    "toneId", id,
                    "category", tone.getCategory().getName(),
                    "path", List.of()
            );
        }
        List<String> codes = firstPath.get();
        var resolved = hsTreeService.resolvePath(codes);
        return Map.of(
                "toneId", id,
                "category", tone.getCategory().getName(),
                "path", resolved
        );
    }

    @PutMapping("/tones/{id}/wiki-title")
    public ToneDto overrideWikiTitle(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return toneService.overrideWikipediaTitle(id, body.get("pageTitle"));
    }

    /**
     * Voortgang van de wiki-warmup. De frontend pollt dit terwijl
     * {@code complete} false is, toont een laad-indicator en ververst de
     * tone-lijst zodra er nieuwe thumbnails klaarstaan.
     */
    @GetMapping("/wiki/status")
    public WarmupStatusDto wikiStatus() {
        return wikiService.warmupStatus();
    }

    @PostMapping("/wiki/refresh-missing")
    public Map<String, Integer> refreshMissingWiki() {
        return Map.of("refreshed", wikiService.refreshMissing());
    }

    @PostMapping("/wiki/refresh-thumbnails")
    public Map<String, Integer> refreshAllThumbnails() {
        return Map.of("refreshed", wikiService.refreshAllThumbnails());
    }
}
