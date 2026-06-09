package com.rolandapp.controller;

import com.rolandapp.dto.ToneCategoryDto;
import com.rolandapp.dto.ToneDetailDto;
import com.rolandapp.dto.ToneDto;
import com.rolandapp.dto.WikiDataDto;
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

    public ToneController(ToneService toneService, WikiService wikiService) {
        this.toneService = toneService;
        this.wikiService = wikiService;
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
                                  @RequestParam(required = false) String q) {
        return toneService.search(category, subCategory, q);
    }

    @GetMapping("/tones/{id}")
    public ToneDetailDto getTone(@PathVariable Long id) {
        return toneService.getDetail(id);
    }

    @GetMapping("/tones/{id}/wiki")
    public WikiDataDto getWiki(@PathVariable Long id,
                               @RequestParam(defaultValue = "false") boolean refresh) {
        return wikiService.getWikiData(id, refresh);
    }

    @PutMapping("/tones/{id}/wiki-title")
    public ToneDto overrideWikiTitle(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return toneService.overrideWikipediaTitle(id, body.get("pageTitle"));
    }

    @PostMapping("/wiki/refresh-missing")
    public Map<String, Integer> refreshMissingWiki() {
        return Map.of("refreshed", wikiService.refreshMissing());
    }
}
