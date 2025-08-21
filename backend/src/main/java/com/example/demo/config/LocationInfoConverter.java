package com.example.demo.config;

import com.example.demo.entity.LocationInfo;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.ReadingConverter;
import org.springframework.stereotype.Component;
import java.util.ArrayList;
import java.util.Map;

@Component  // Add this annotation
@ReadingConverter
public class LocationInfoConverter implements Converter<Object, LocationInfo> {
    @Override
    public LocationInfo convert(Object source) {
        LocationInfo locationInfo = new LocationInfo();
        
        if (source == null) {
            return locationInfo;
        }
        
        if (source instanceof ArrayList && ((ArrayList<?>) source).isEmpty()) {
            return locationInfo;
        }
        
        if (source instanceof Map) {
            Map<?, ?> map = (Map<?, ?>) source;
            locationInfo.setRiver((String) map.get("river"));
            locationInfo.setCity((String) map.get("city"));
            locationInfo.setRegion((String) map.get("region"));
            locationInfo.setCountry((String) map.get("country"));
            locationInfo.setContinent((String) map.get("continent"));
            
            Object latitude = map.get("latitude");
            Object longitude = map.get("longitude");
            
            locationInfo.setLatitude(latitude != null ? ((Number) latitude).doubleValue() : null);
            locationInfo.setLongitude(longitude != null ? ((Number) longitude).doubleValue() : null);
        }
        
        return locationInfo;
    }
}