package com.rolandapp.dto;

import java.util.List;

/** Achtergrond per instrument, al taal-geselecteerd: samenvatting + fact-blokken. */
public record InstrumentBackgroundDto(String pageTitle, String summary, List<FactDto> facts) {
}
