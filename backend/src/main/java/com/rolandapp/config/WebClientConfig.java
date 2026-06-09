package com.rolandapp.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Bean
    public WebClient wikipediaClient(@Value("${app.wikipedia.base-url}") String baseUrl) {
        return WebClient.builder()
                .baseUrl(baseUrl)
                // Wikipedia asks API clients to identify themselves
                .defaultHeader(HttpHeaders.USER_AGENT,
                        "RolandLX708ToneLibrary/0.1 (https://github.com/jer-novi/roland-lx708-tone-library-poc)")
                .exchangeStrategies(ExchangeStrategies.builder()
                        // Full article HTML can be several MB
                        .codecs(c -> c.defaultCodecs().maxInMemorySize(8 * 1024 * 1024))
                        .build())
                .build();
    }
}
