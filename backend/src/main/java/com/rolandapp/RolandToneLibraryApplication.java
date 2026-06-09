package com.rolandapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class RolandToneLibraryApplication {

    public static void main(String[] args) {
        SpringApplication.run(RolandToneLibraryApplication.class, args);
    }
}
