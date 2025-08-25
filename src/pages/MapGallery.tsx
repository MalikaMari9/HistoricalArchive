//import MarkerClusterGroup from '@changey/react-leaflet-markercluster';
import { AdvancedSearchDialog } from "@/components/gallery/AdvancedSearchDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchArts, searchDetailedArts, SearchFilters } from "@/services/api";
import { ArrowLeft, Grid, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

// Leaflet imports with museum enhancements
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, ScaleControl, useMap } from "react-leaflet";
import MarkerClusterGroup from '@changey/react-leaflet-markercluster';

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

// Enhanced map component for museum bounds fitting
function MuseumMapBounds({ artifacts }: { artifacts: Artifact[] }) {
  const map = useMap();

  useEffect(() => {
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

    if (validCoordinates.length > 0) {
      if (validCoordinates.length === 1) {
        // Single marker - center on it with museum-appropriate zoom
        map.setView(validCoordinates[0], 12);
      } else {
        // Multiple markers - fit bounds with padding for better visualization
        const bounds = L.latLngBounds(validCoordinates);
        map.fitBounds(bounds, {
          padding: [30, 30],
          maxZoom: 15, // Prevent over-zooming on clusters
        });
      }
    } else {
      // No valid coordinates - show world view centered on major museum cities
      map.setView([40, 0], 3); // Slightly higher zoom for cultural context
    }
  }, [artifacts, map]);

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
    const newFilters = { anyField: searchQuery };
    console.log("Search clicked with query:", searchQuery);
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

    return badges;
  };

  const removeFilter = (filterKey: string, filterValue: string) => {
    if (filterKey === "search") {
      setSearchQuery("");
      setSearchParams({});
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
            zoom={3}
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

            {/* Museum Map Bounds */}
            <MuseumMapBounds artifacts={artifactsWithCoordinates} />

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
