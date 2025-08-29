//import MarkerClusterGroup from '@changey/react-leaflet-markercluster';
import { AdvancedSearchDialog } from "@/components/gallery/AdvancedSearchDialog";
import LocationSearch, {
  LocationSearchData,
} from "@/components/map/LocationSearch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchArts, searchDetailedArts, SearchFilters } from "@/services/api";
import { ArrowLeft, Grid, MapPin, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

// Leaflet imports with museum enhancements
import MarkerClusterGroup from "@changey/react-leaflet-markercluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  Marker,
  Popup,
  ScaleControl,
  useMap,
} from "react-leaflet";

// Custom museum components
import MuseumMapLayers from "@/components/map/MuseumMapLayers";
import MuseumMarker from "@/components/map/MuseumMarker";

// Museum map styles
import "@/styles/museum-map.css";

// Define Artifact interface that matches our actual data structure
interface Artifact {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  category?: string;
  culture?: string;
  period?: string;
  medium?: string;
  location?: {
    city?: string;
    country?: string;
    continent?: string;
    latitude?: number;
    longitude?: number;
  };
  image_url?: string;
  images?: Array<{ baseimageurl?: string }>;
  averageRating?: number;
  totalRatings?: number;
  artist_name?: string;
}

// Custom cluster icon for museum artifacts
const createClusterCustomIcon = (cluster: any) => {
  const count = cluster.getChildCount();
  const size = count < 10 ? 40 : count < 100 ? 50 : 60;

  return L.divIcon({
    html: `
      <div class="marker-cluster" style="
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #8b4513, #a0522d);
        border: 4px solid white;
        border-radius: 50%;
        color: white;
        font-weight: bold;
        font-size: ${count < 10 ? "14px" : count < 100 ? "16px" : "18px"};
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
        cursor: pointer;
        position: relative;
      ">
        <div style="text-align: center;">
          <div style="font-size: ${count < 10 ? "16px" : "18px"};">🏛️</div>
          <div style="font-size: ${
            count < 10 ? "10px" : "12px"
          }; margin-top: -2px;">${count}</div>
        </div>
      </div>
    `,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Enhanced map component for museum bounds fitting and live location search
function MuseumMapBounds({
  artifacts,
  searchLocation,
}: {
  artifacts: Artifact[];
  searchLocation?: { lat: number; lng: number; name: string } | null;
}) {
  const map = useMap();

  // Handle search location navigation with enhanced auto-zoom
  useEffect(() => {
    if (searchLocation) {
      console.log("🗺️ Auto-zooming to search location:", searchLocation);
      // Higher zoom for better location detail viewing
      map.setView([searchLocation.lat, searchLocation.lng], 15, {
        animate: true,
        duration: 1.5, // Smooth animation
      });
    }
  }, [searchLocation, map]);

  // Handle artifact bounds fitting with enhanced auto-zoom (only when no search location)
  useEffect(() => {
    if (searchLocation) return; // Don't auto-fit bounds when user is searching location

    const validCoordinates = artifacts
      .filter(
        (artifact) =>
          artifact.location?.latitude &&
          artifact.location?.longitude &&
          !isNaN(artifact.location.latitude) &&
          !isNaN(artifact.location.longitude)
      )
      .map(
        (artifact) =>
          [artifact.location!.latitude!, artifact.location!.longitude!] as [
            number,
            number
          ]
      );

    console.log("🎯 Auto-zooming to", validCoordinates.length, "artifacts");

    if (validCoordinates.length > 0) {
      if (validCoordinates.length === 1) {
        // Single artifact - zoom in closer for better detail
        map.setView(validCoordinates[0], 14, {
          animate: true,
          duration: 1.2,
        });
        console.log("🔍 Single artifact zoom to level 14");
      } else if (validCoordinates.length <= 5) {
        // Few artifacts - fit bounds with higher zoom
        const bounds = L.latLngBounds(validCoordinates);
        map.fitBounds(bounds, {
          padding: [40, 40],
          maxZoom: 13, // Higher zoom for small clusters
          animate: true,
          duration: 1.2,
        });
        console.log("🔍 Small cluster zoom (max level 13)");
      } else {
        // Many artifacts - fit bounds with moderate zoom
        const bounds = L.latLngBounds(validCoordinates);
        map.fitBounds(bounds, {
          padding: [30, 30],
          maxZoom: 11, // Moderate zoom for large clusters
          animate: true,
          duration: 1.5,
        });
        console.log("🔍 Large cluster zoom (max level 11)");
      }
    } else {
      // No valid coordinates - show world view
      map.setView([40, 0], 4, {
        animate: true,
        duration: 2,
      }); // Slightly higher default zoom
      console.log("🌍 No artifacts - world view at level 4");
    }
  }, [artifacts, map, searchLocation]);

  return null;
}

export default function MapGallery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [activeFilters, setActiveFilters] = useState<
    Omit<SearchFilters, "page" | "size">
  >({});
  const [hasSearched, setHasSearched] = useState(false);
  const [locationData, setLocationData] = useState<LocationSearchData>({
    placename: "",
    city: "",
    country: "",
    latitude: undefined,
    longitude: undefined,
  });
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [searchLocationMarker, setSearchLocationMarker] = useState<{
    lat: number;
    lng: number;
    name: string;
  } | null>(null);

  const fetchData = async (currentFilters = activeFilters) => {
    console.log("Fetching with filters:", currentFilters);
    try {
      setLoading(true);
      // Fetch more items for map view (no pagination)
      const data = await searchArts({
        ...currentFilters,
        page: 0,
        size: 1000, // Get many more items for map view
      });

      setArtifacts((data.content || []) as Artifact[]);
      setTotalCount(data.totalElements || 0);
    } catch (err) {
      console.error("Fetch failed", err);
      setArtifacts([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const newFilters: Omit<SearchFilters, "page" | "size"> = {
      anyField: searchQuery,
      ...(locationData.latitude && locationData.longitude
        ? {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            radius: 25, // Default 25km radius for location searches
            city: locationData.city,
            country: locationData.country,
          }
        : {}),
    };
    console.log(
      "Search clicked with query:",
      searchQuery,
      "and location:",
      locationData
    );
    setActiveFilters(newFilters);
    setHasSearched(true);
    if (searchQuery) {
      setSearchParams({ search: searchQuery });
    } else {
      setSearchParams({});
    }
    fetchData(newFilters);
  };

  const handleAdvancedSearch = async (
    newFilters: Omit<SearchFilters, "page" | "size">
  ) => {
    const formattedFilters = {
      ...newFilters,
      fromDate: newFilters.fromDate
        ? new Date(newFilters.fromDate).toISOString().split("T")[0]
        : undefined,
      toDate: newFilters.toDate
        ? new Date(newFilters.toDate).toISOString().split("T")[0]
        : undefined,
      // Include location filters if set
      ...(locationData.latitude && locationData.longitude
        ? {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            radius: 25, // Default 25km radius for location searches
            city: locationData.city,
            country: locationData.country,
          }
        : {}),
    };

    console.log("🔍 Advanced search filters:", formattedFilters);
    try {
      setLoading(true);
      const data = await searchDetailedArts({
        ...formattedFilters,
        page: 0,
        size: 1000,
      });
      setArtifacts((data.content || []) as Artifact[]);
      setTotalCount(data.totalElements || 0);
      setActiveFilters(formattedFilters);
      setHasSearched(true);
    } catch (err) {
      console.error("Advanced search failed:", err);
      setArtifacts([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setActiveFilters({});
    setSearchParams({});
    setHasSearched(false);
    setLocationData({
      placename: "",
      city: "",
      country: "",
      latitude: undefined,
      longitude: undefined,
    });
    setSearchLocationMarker(null); // Clear search marker
    fetchData({});
  };

  const getActiveFilterBadges = () => {
    const badges = [];

    if (searchQuery) {
      badges.push({
        key: "search",
        value: searchQuery,
        label: `Search: "${searchQuery}"`,
      });
    }

    if (activeFilters.title) {
      badges.push({
        key: "title",
        value: activeFilters.title,
        label: `Title: "${activeFilters.title}"`,
      });
    }

    if (activeFilters.category) {
      badges.push({
        key: "category",
        value: activeFilters.category,
        label: `Category: ${activeFilters.category}`,
      });
    }

    if (activeFilters.culture) {
      badges.push({
        key: "culture",
        value: activeFilters.culture,
        label: `Culture: ${activeFilters.culture}`,
      });
    }

    if (activeFilters.department) {
      badges.push({
        key: "department",
        value: activeFilters.department,
        label: `Department: ${activeFilters.department}`,
      });
    }

    if (activeFilters.period) {
      badges.push({
        key: "period",
        value: activeFilters.period,
        label: `Period: ${activeFilters.period}`,
      });
    }

    if (activeFilters.tags) {
      badges.push({
        key: "tags",
        value: activeFilters.tags,
        label: `Tags: #${activeFilters.tags}`,
      });
    }

    if (activeFilters.artistName) {
      badges.push({
        key: "artistName",
        value: activeFilters.artistName,
        label: `Artist: ${activeFilters.artistName}`,
      });
    }

    // Location filters
    if (locationData.placename) {
      badges.push({
        key: "location",
        value: locationData.placename,
        label: `📍 Near: ${locationData.placename} (25km)`,
      });
    }

    return badges;
  };

  const removeFilter = (filterKey: string, filterValue: string) => {
    if (filterKey === "search") {
      setSearchQuery("");
      setSearchParams({});
    } else if (filterKey === "location") {
      // Clear location filter
      setLocationData({
        placename: "",
        city: "",
        country: "",
        latitude: undefined,
        longitude: undefined,
      });
      setSearchLocationMarker(null); // Clear search marker when removing location filter
    } else {
      const newFilters = { ...activeFilters };
      delete newFilters[filterKey as keyof typeof activeFilters];
      setActiveFilters(newFilters);

      if (filterKey === "anyField" || Object.keys(newFilters).length === 0) {
        setSearchParams({});
      }
    }

    const updatedFilters =
      filterKey === "search"
        ? activeFilters
        : filterKey === "location"
        ? (() => {
            // Remove location-related filters from activeFilters
            const { latitude, longitude, radius, city, country, ...rest } =
              activeFilters;
            return rest;
          })()
        : (() => {
            const newFilters = { ...activeFilters };
            delete newFilters[filterKey as keyof typeof activeFilters];
            return newFilters;
          })();

    fetchData(updatedFilters);
  };

  // Check URL search parameters on mount
  useEffect(() => {
    const urlSearchQuery = searchParams.get("search");
    if (urlSearchQuery) {
      setSearchQuery(urlSearchQuery);
      const newFilters = { anyField: urlSearchQuery };
      setActiveFilters(newFilters);
      setHasSearched(true);
      fetchData(newFilters);
    } else {
      fetchData({});
    }
  }, [searchParams]);

  // Get artifacts with valid coordinates
  const artifactsWithCoordinates = artifacts.filter(
    (artifact) =>
      artifact.location?.latitude &&
      artifact.location?.longitude &&
      !isNaN(artifact.location.latitude) &&
      !isNaN(artifact.location.longitude)
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/gallery")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Gallery
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Museum Map Gallery
                </h1>
                <p className="text-sm text-muted-foreground">
                  Discover cultural artifacts and artworks from museums
                  worldwide
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate("/gallery")}
              className="text-slate-700 border-slate-700 hover:bg-slate-50"
            >
              <Grid className="h-4 w-4 mr-2" />
              Grid View
            </Button>
          </div>
        </div>
      </div>

      {/* Search Controls */}
      <div className="bg-card border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            {/* Main search row */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search artworks, artists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={handleSearch}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button
                variant="outline"
                onClick={() => setAdvancedSearchOpen(true)}
                className="text-amber-700 border-amber-700 hover:bg-amber-50"
              >
                Detail Search
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowLocationSearch(!showLocationSearch)}
                className="text-blue-700 border-blue-700 hover:bg-blue-50"
              >
                <MapPin className="h-4 w-4 mr-2" />
                {showLocationSearch ? "Hide" : "Location"}
              </Button>
            </div>

            {/* Location search section */}
            {showLocationSearch && (
              <div className="bg-muted/50 rounded-lg p-4 border">
                <LocationSearch
                  value={locationData}
                  onChange={setLocationData}
                  onLocationSelect={(location) => {
                    // Handle live location search - create marker and navigate map
                    if (
                      location.latitude &&
                      location.longitude &&
                      location.placename
                    ) {
                      console.log(
                        "🎯 Live location selected - auto-zooming:",
                        location
                      );
                      setSearchLocationMarker({
                        lat: location.latitude,
                        lng: location.longitude,
                        name: location.placename,
                      });
                    } else {
                      setSearchLocationMarker(null);
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Results Banner */}
      {hasSearched &&
        (searchQuery || Object.keys(activeFilters).length > 0) &&
        !loading && (
          <div className="bg-card border-b">
            <div className="container mx-auto px-4 py-4">
              <div className="p-4 bg-gradient-to-r from-cream to-warm-white dark:from-slate-800 dark:to-slate-700 border border-brown-light/30 dark:border-slate-600 rounded-lg shadow-soft">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-2 h-2 bg-brown-medium rounded-full shadow-sm"></div>
                      <div>
                        <h3 className="font-semibold text-brown-dark dark:text-foreground">
                          Museum Collection Results
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {totalCount}{" "}
                          {totalCount === 1
                            ? "cultural artifact"
                            : "cultural artifacts"}{" "}
                          discovered, {artifactsWithCoordinates.length} with
                          geographic locations on the museum map
                        </p>
                      </div>
                    </div>

                    {/* Active Filters */}
                    <div className="flex flex-wrap gap-2">
                      {getActiveFilterBadges().map((filter, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="bg-brown-light/50 text-brown-dark border border-brown-medium/20 hover:bg-brown-light/70 transition-colors"
                        >
                          <span className="text-xs font-medium">
                            {filter.label}
                          </span>
                          <button
                            onClick={() =>
                              removeFilter(filter.key, filter.value)
                            }
                            className="ml-1.5 hover:text-brown-dark/80 transition-colors"
                            title={`Remove ${filter.label} filter`}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-brown-medium hover:text-brown-dark hover:bg-brown-light/20 dark:text-muted-foreground dark:hover:text-foreground dark:hover:bg-accent shrink-0"
                  >
                    Clear all
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Map Container */}
      <div
        className="relative flex-1"
        style={{ height: "calc(100vh - 200px)" }}
      >
        {loading ? (
          <div className="museum-map-loading">
            <div className="museum-map-loading-content">
              <div className="museum-map-loading-spinner"></div>
              <h3 className="text-lg font-semibold mb-2">Loading Museum Map</h3>
              <p className="text-sm">
                Discovering cultural artifacts worldwide...
              </p>
            </div>
          </div>
        ) : (
          <MapContainer
            center={[40, 0]}
            zoom={4}
            style={{ height: "100%", width: "100%", zIndex: 1 }}
            className="museum-map-container"
            scrollWheelZoom={true}
            doubleClickZoom={true}
            dragging={true}
            zoomControl={true}
          >
            {/* Museum Map Layers */}
            <MuseumMapLayers />

            {/* Scale Control */}
            <ScaleControl position="bottomleft" />

            {/* Museum Map Bounds with Live Location Search */}
            <MuseumMapBounds
              artifacts={artifactsWithCoordinates}
              searchLocation={searchLocationMarker}
            />

            {/* Search Location Marker */}
            {searchLocationMarker && (
              <Marker
                position={[searchLocationMarker.lat, searchLocationMarker.lng]}
                icon={L.divIcon({
                  html: `
                    <div style="
                      width: 30px;
                      height: 30px;
                      background: linear-gradient(135deg, #ef4444, #dc2626);
                      border: 3px solid white;
                      border-radius: 50%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                      animation: bounce 1s ease-out;
                    ">
                      <div style="color: white; font-size: 16px; font-weight: bold;">📍</div>
                    </div>
                    <style>
                      @keyframes bounce {
                        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                        40% { transform: translateY(-10px); }
                        60% { transform: translateY(-5px); }
                      }
                    </style>
                  `,
                  className: "",
                  iconSize: [30, 30],
                  iconAnchor: [15, 15],
                })}
              >
                <Popup>
                  <div className="text-center">
                    <div className="font-semibold text-sm mb-1">
                      🔍 Search Location
                    </div>
                    <div className="text-xs text-gray-600">
                      {searchLocationMarker.name}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Clustered Museum Markers */}
            <MarkerClusterGroup
              chunkedLoading
              iconCreateFunction={createClusterCustomIcon}
              maxClusterRadius={60}
              spiderfyOnMaxZoom={true}
              showCoverageOnHover={true}
              zoomToBoundsOnClick={true}
              spiderfyDistanceMultiplier={2}
              removeOutsideVisibleBounds={true}
              animate={true}
              animateAddingMarkers={true}
              disableClusteringAtZoom={16}
            >
              {artifactsWithCoordinates.map((artifact) => (
                <MuseumMarker
                  key={artifact._id || artifact.id}
                  artifact={artifact}
                />
              ))}
            </MarkerClusterGroup>
          </MapContainer>
        )}
      </div>

      {/* Advanced Search Dialog */}
      <AdvancedSearchDialog
        open={advancedSearchOpen}
        onOpenChange={setAdvancedSearchOpen}
        onSearch={handleAdvancedSearch}
      />
    </div>
  );
}
