package com.rolandapp;

import com.rolandapp.dto.ToneCategoryDto;
import com.rolandapp.dto.ToneDto;
import com.rolandapp.service.ToneService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class SeedAndApiSmokeTest {

    @Autowired
    private ToneService toneService;

    @Test
    void seedLoadsFullToneList() {
        List<ToneCategoryDto> categories = toneService.getCategories();
        assertThat(categories).extracting(ToneCategoryDto::name)
                .containsExactly("Piano", "E. Piano", "Strings", "Other");
        assertThat(categories).extracting(ToneCategoryDto::toneCount)
                .containsExactly(4L, 11L, 18L, 291L);
    }

    @Test
    void searchFiltersByCategorySubCategoryAndQuery() {
        assertThat(toneService.search("Piano", null, null)).hasSize(4);
        assertThat(toneService.search("Other", "Drums", null)).hasSize(9);

        List<ToneDto> rhodes = toneService.search(null, null, "suitcase");
        assertThat(rhodes).hasSize(1);
        assertThat(rhodes.getFirst().name()).isEqualTo("1976SuitCase");
        assertThat(rhodes.getFirst().wikipediaPageTitle()).isEqualTo("Rhodes piano");
    }

    @Test
    void midiMappingIsSeededForAllTones() {
        List<ToneDto> all = toneService.search(null, null, null);
        assertThat(all).hasSize(324);
        assertThat(all).allSatisfy(tone -> {
            assertThat(tone.midiBankMsb()).isBetween(0, 127);
            assertThat(tone.midiBankLsb()).isBetween(0, 127);
            assertThat(tone.midiProgram()).isBetween(1, 128);
        });

        // Steekproef tegen de officiële MIDI Implementation (sectie 4. Tone List)
        ToneDto europeanGrand = toneService.search("Piano", null, "European Grand").getFirst();
        assertThat(europeanGrand.midiBankMsb()).isEqualTo(0);
        assertThat(europeanGrand.midiBankLsb()).isEqualTo(68);
        assertThat(europeanGrand.midiProgram()).isEqualTo(1);

        ToneDto suitcase = toneService.search(null, null, "1976SuitCase").getFirst();
        assertThat(suitcase.midiBankMsb()).isEqualTo(8);
        assertThat(suitcase.midiBankLsb()).isEqualTo(71);
        assertThat(suitcase.midiProgram()).isEqualTo(5);

        ToneDto explosion = toneService.search("Other", "GM2", "Explosion").getFirst();
        assertThat(explosion.midiBankMsb()).isEqualTo(121);
        assertThat(explosion.midiBankLsb()).isEqualTo(3);
        assertThat(explosion.midiProgram()).isEqualTo(128);
    }

    @Test
    void gm2RangeIsComplete() {
        List<ToneDto> gm2 = toneService.search("Other", "GM2", null);
        assertThat(gm2).hasSize(256);
        assertThat(gm2.getFirst().toneNumber()).isEqualTo(36);
        assertThat(gm2.getLast().toneNumber()).isEqualTo(291);
        assertThat(gm2.getLast().name()).isEqualTo("Explosion");
    }
}
