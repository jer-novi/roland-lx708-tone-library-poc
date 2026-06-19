package com.rolandapp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * In-memory index van {@code data/horn_bostel_sachs_tree.json} (geparsed
 * door scripts/parse_hs_tree.py in Fase 1.1). Bundel de JSON als classpath
 * resource zodat we niets op disk hoeven te lezen en de API direct
 * beschikbaar is bij cold start.
 *
 * <p>De tree heeft een 4-niveau structuur:
 * <pre>
 *   family (5)          bv. 3 = Chordophones
 *     subfamily (11)    bv. 32 = Composite chordophones
 *       subsub (2)      bv. 321.3 = Keyboard chordophones (zelden)
 *         instrument   bv. 321.322 = Pianoforte
 * </pre>
 *
 * <p>Lookup gebeurt op hs_code (string zoals "3" of "321.322"). De map
 * bevat alleen nodes met een niet-lege hs_code; de all_instruments-flat-list
 * uit het JSON is de bron voor leaf-level instrumenten.
 */
@Service
public class HsTreeService {

    private static final Logger log = LoggerFactory.getLogger(HsTreeService.class);

    private final ObjectMapper objectMapper = new ObjectMapper();
    /** Volledige tree als JsonNode — doorgeven aan de frontend. */
    private JsonNode fullTree;
    /** hs_code → node (alle levels behalve family zonder eigen code). */
    private final Map<String, JsonNode> byHsCode = new HashMap<>();

    @PostConstruct
    void load() {
        try (InputStream in = new ClassPathResource("data/horn_bostel_sachs_tree.json").getInputStream()) {
            fullTree = objectMapper.readTree(in);
            indexRecursive(fullTree.path("families"));
            log.info("HsTreeService: {} HS-codes geïndexeerd uit de classpath tree", byHsCode.size());
        } catch (Exception e) {
            log.error("Kon horn_bostel_sachs_tree.json niet laden vanuit classpath", e);
            fullTree = objectMapper.createObjectNode();
        }
    }

    private void indexRecursive(JsonNode nodes) {
        if (!nodes.isArray()) return;
        for (JsonNode node : nodes) {
            String code = node.path("hs_code").asText(null);
            if (code != null && !code.isBlank()) {
                byHsCode.put(code, node);
            }
            // Recurse in subfamilies (geneste nodes)
            JsonNode subs = node.path("subfamilies");
            if (subs.isArray() && !subs.isEmpty()) {
                indexRecursive(subs);
            }
            // Ook leaf-level instruments indexeren — die hebben soms codes
            // (bv. 321.322, 111.212) die verwijzen naar specifieke types
            // die niet als subfamily in de tree staan.
            JsonNode instruments = node.path("instruments");
            if (instruments.isArray()) {
                for (JsonNode inst : instruments) {
                    String instCode = inst.path("hs_code").asText(null);
                    if (instCode != null && !instCode.isBlank()) {
                        byHsCode.putIfAbsent(instCode, inst);
                    }
                }
            }
        }
    }

    public JsonNode getFullTree() {
        return fullTree;
    }

    /**
     * @return de node met deze HS-code, of leeg als hij niet bestaat.
     */
    public Optional<JsonNode> findByHsCode(String hsCode) {
        if (hsCode == null || hsCode.isBlank()) return Optional.empty();
        return Optional.ofNullable(byHsCode.get(hsCode));
    }

    /**
     * Resolve een reeks HS-codes (van root-family tot leaf) naar een lijst
     * van {@code (code, name)}-paren, plus de slug-velden die de frontend
     * nodig heeft voor tooltips.
     *
     * <p>Belangrijk: de museum-tree bevat per leaf-code meerdere
     * instrumenten (bv. 321.322 wordt gedeeld door Piano, Gitaar, Bas,
     * etc.). Voor de leaf-code van een Roland-tone willen we de canonieke
     * HS-naam (Pianoforte), niet de museum-specimens. Daarom gebruikt de
     * LAATSTE code in het pad altijd de {@link #leafNameFromCode} switch,
     * ongeacht wat de tree zegt. Intermediate codes (family, sub) gaan
     * wel via de tree-lookup.
     */
    public List<Map<String, String>> resolvePath(List<String> hsCodes) {
        if (hsCodes == null) return List.of();
        List<Map<String, String>> out = new ArrayList<>();
        int lastIndex = hsCodes.size() - 1;
        for (int i = 0; i < hsCodes.size(); i++) {
            String code = hsCodes.get(i);
            boolean isLeaf = (i == lastIndex);
            Map<String, String> entry = new HashMap<>();
            entry.put("code", code != null ? code : "");
            if (code == null) {
                entry.put("name", "");
                entry.put("slug", "");
                entry.put("level", "0");
            } else if (isLeaf) {
                // Laatste in het pad = het tone-specifieke leaf. Gebruik
                // de canonieke HS-naam (Pianoforte) zodat de boom geen
                // museum-specimens (gitaar, bas, etc.) toont voor de
                // abstracte code 321.322.
                entry.put("name", leafNameFromCode(code));
                entry.put("slug", code.replaceAll("\\.", "-"));
                entry.put("level", "4");
            } else {
                JsonNode node = byHsCode.get(code);
                if (node != null && !node.path("name").asText("").isBlank()) {
                    entry.put("name", node.path("name").asText(""));
                    entry.put("slug", node.path("slug").asText(""));
                    entry.put("level", String.valueOf(node.path("level").asInt(0)));
                } else {
                    entry.put("name", leafNameFromCode(code));
                    entry.put("slug", code.replaceAll("\\.", "-"));
                    entry.put("level", String.valueOf(isLeaf ? 4 : 0));
                }
            }
            out.add(entry);
        }
        return out;
    }

    /**
     * Minimale HS-code → naam lookup voor leaf-level codes. Gebaseerd op
     * de standaard HS-classificatie (Sachs 1913 / MIMO 2014). Niet
     * uitputtend — dekt alleen de families waar de 324 Roland-tonen
     * voorkomen. Onbekende codes krijgen de code zelf als label terug.
     */
    private static String leafNameFromCode(String code) {
        return switch (code) {
            // 321.x — Keyboard chordophones
            case "321.322" -> "Pianoforte";
            case "321.321" -> "Harpsichord";
            case "321.31" -> "Harpsichord family";
            // 3 — Chordophones
            case "3" -> "Chordophones";
            case "31" -> "Simple chordophones";
            case "32" -> "Composite chordophones";
            case "321" -> "Lutes";
            case "322" -> "Harps";
            // 4 — Aerophones
            case "4" -> "Aerophones";
            case "41" -> "Free aerophones";
            case "42" -> "Non-free aerophones (wind instruments proper)";
            case "421" -> "Edge-blown aerophones (flutes)";
            case "422" -> "Reed aerophones";
            case "423" -> "Trumpet aerophones (brass)";
            // 2 — Membranophones
            case "2" -> "Membranophones";
            case "21" -> "Struck membranophones";
            case "211" -> "Drums";
            case "22" -> "Played membranophones";
            // 1 — Idiophones
            case "1" -> "Idiophones";
            case "11" -> "Struck idiophones";
            case "111" -> "Directly struck idiophones";
            case "111.212" -> "Xylophones / Marimbas";
            case "12" -> "Plucked idiophones";
            // 5 — Electrophones
            case "5" -> "Electrophones";
            case "51" -> "Electroacoustic (radioelectric) instruments";
            case "52" -> "Electronic instruments (electromechanical)";
            default -> code;
        };
    }
}
