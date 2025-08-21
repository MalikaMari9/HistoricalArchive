package com.example.demo.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;
import java.util.Arrays;

@Configuration
public class MongoConfig {
    @Bean
    public MongoCustomConversions customConversions(LocationInfoConverter locationInfoConverter) {
        return new MongoCustomConversions(Arrays.asList(locationInfoConverter));
       
    }
    
    
}