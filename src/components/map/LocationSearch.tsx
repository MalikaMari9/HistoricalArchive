import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface LocationSearchData {
  placename?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

interface LocationSearchProps {
  value: LocationSearchData;
  onChange: (loc: LocationSearchData) => void;
  onLocationSelect?: (loc: LocationSearchData) => void; // For live map updates
  disabled?: boolean;
}

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

export default function LocationSearch({
  value,
  onChange,
  onLocationSelect,
  disabled,
}: LocationSearchProps) {
  const [searchQuery, setSearchQuery] = useState(value.placename || "");
  const [isFetching, setIsFetching] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const justSelectedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSuggestions = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsFetching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query
        )}&format=json&addressdetails=1&limit=5`
      );
      const data = await res.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch (err) {
      console.error("Location search error:", err);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    console.log("📍 Selected location:", suggestion);

    const lat = parseFloat(suggestion.lat);
    const lon = parseFloat(suggestion.lon);

    const isTokyo =
      suggestion.address["ISO3166-2-lvl4"] === "JP-13" ||
      suggestion.address.state === "Tokyo" ||
      suggestion.display_name.includes("Tokyo");

    const city = isTokyo
      ? "Tokyo"
      : suggestion.address.city ||
        suggestion.address.town ||
        suggestion.address.village ||
        suggestion.address.state ||
        "";

    const country = suggestion.address.country || "";

    const newLocation: LocationSearchData = {
      placename: suggestion.display_name,
      city,
      country,
      latitude: lat,
      longitude: lon,
    };

    setSearchQuery(suggestion.display_name);
    justSelectedRef.current = true;
    setSuggestions([]);
    setShowSuggestions(false);

    // Update the form data
    onChange(newLocation);

    // Trigger live map update
    if (onLocationSelect) {
      onLocationSelect(newLocation);
    }
  };

  const clearLocation = () => {
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);

    const emptyLocation = {
      placename: "",
      city: "",
      country: "",
      latitude: undefined,
      longitude: undefined,
    };

    onChange(emptyLocation);
    if (onLocationSelect) {
      onLocationSelect(emptyLocation);
    }
  };

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      if (!justSelectedRef.current) {
        fetchSuggestions(searchQuery);
      } else {
        justSelectedRef.current = false;
      }
    }, 300); // Faster response for live search
  }, [searchQuery]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".location-search-container")) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="space-y-2 relative location-search-container">
      <Label
        htmlFor="live-location-search"
        className="text-sm font-medium text-foreground"
      >
        🗺️ Search Location (Live)
      </Label>

      <div className="relative">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            id="live-location-search"
            placeholder="Type city, country, or landmark... (e.g., Tokyo, Paris, New York)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={disabled}
            className="pl-10 pr-8"
          />

          {isFetching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {searchQuery && !isFetching && (
            <button
              type="button"
              onClick={clearLocation}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              title="Clear location"
            >
              ×
            </button>
          )}
        </div>

        {/* Live suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                className="w-full px-4 py-3 text-left hover:bg-muted border-b border-border last:border-b-0 focus:outline-none focus:bg-muted transition-colors"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-sm text-foreground truncate">
                      {suggestion.display_name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {suggestion.address.country}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Current selection indicator */}
      {value.placename && value.latitude && value.longitude && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
          📍 <strong>{value.placename}</strong>
          <span className="ml-2 opacity-75">
            ({value.latitude.toFixed(4)}, {value.longitude.toFixed(4)})
          </span>
        </div>
      )}
    </div>
  );
}
