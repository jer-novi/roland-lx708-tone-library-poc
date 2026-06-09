package com.rolandapp.dto;

import com.rolandapp.model.ToneCategory;

public record ToneCategoryDto(Long id, String name, int displayOrder, String description, long toneCount) {

    public static ToneCategoryDto from(ToneCategory category, long toneCount) {
        return new ToneCategoryDto(category.getId(), category.getName(),
                category.getDisplayOrder(), category.getDescription(), toneCount);
    }
}
