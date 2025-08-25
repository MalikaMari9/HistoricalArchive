package com.example.demo.config;

import org.apache.tomcat.util.http.Rfc6265CookieProcessor;
import org.apache.catalina.Context;
import org.springframework.boot.web.embedded.tomcat.TomcatContextCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CookieConfig {

    @Bean
    public TomcatContextCustomizer sameSiteCookieCustomizer() {
        return (Context context) -> {
            Rfc6265CookieProcessor cookieProcessor = new Rfc6265CookieProcessor();
            cookieProcessor.setSameSiteCookies("Lax"); // or "None" for cross-site + Secure
            context.setCookieProcessor(cookieProcessor);
        };
    }
}
