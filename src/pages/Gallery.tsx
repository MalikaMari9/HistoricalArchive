import { AdvancedSearchDialog } from "@/components/gallery/AdvancedSearchDialog";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { searchArts, searchDetailedArts, SearchFilters } from "@/services/api";
import { Map, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

console.log("🖼️ Gallery component rendered");

export default function Gallery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [artData, setArtData] = useState({
    content: [],
    totalPages: 1,
    totalElements: 0,
    number: 0,
    size: 6,
  });

  const [activeFilters, setActiveFilters] = useState<
    Omit<SearchFilters, "page" | "size">
  >({});
  const [hasSearched, setHasSearched] = useState(false);
  const itemsPerPage = 6;

  const fetchData = async (page = 0, currentFilters = activeFilters) => {
    console.log("Fetching with filters:", currentFilters);
    try {
      setLoading(true);
      const data = await searchArts({
        ...currentFilters,
        page,
        size: itemsPerPage,
      });
      setArtData(data);
    } catch (err) {
      console.error("Fetch failed", err);
      setArtData({
        content: [],
        totalPages: 1,
        totalElements: 0,
        number: 0,
        size: itemsPerPage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const newFilters = { anyField: searchQuery };
    console.log("Search clicked with query:", searchQuery);
    setActiveFilters(newFilters);
    setCurrentPage(0);
    setHasSearched(true);
    if (searchQuery) {
      setSearchParams({ search: searchQuery });
    } else {
      setSearchParams({});
    }
    fetchData(0, newFilters); // only one call
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
        size: itemsPerPage,
      });
      setArtData(data);
      setActiveFilters(formattedFilters);
      setCurrentPage(0);
      setHasSearched(true);
    } catch (err) {
      console.error("Advanced search failed:", err);
      setArtData({
        content: [],
        totalPages: 1,
        totalElements: 0,
        number: 0,
        size: itemsPerPage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);

    // Use detailed search if we have tag filters, otherwise use general search
    if (activeFilters.tags) {
      // Perform tag search for pagination
      const performTagSearch = async () => {
        try {
          setLoading(true);
          const data = await searchDetailedArts({
            ...activeFilters,
            page,
            size: itemsPerPage,
          });
          setArtData(data);
        } catch (err) {
          console.error("Tag pagination search failed:", err);
          setArtData({
            content: [],
            totalPages: 1,
            totalElements: 0,
            number: 0,
            size: itemsPerPage,
          });
        } finally {
          setLoading(false);
        }
      };
      performTagSearch();
    } else {
      fetchData(page, activeFilters);
    }
  };

  const getSearchResultsTitle = () => {
    const filters = [];

    if (searchQuery) {
      filters.push(`Search: "${searchQuery}"`);
    }

    if (activeFilters.title) filters.push(`Title: "${activeFilters.title}"`);
    if (activeFilters.category)
      filters.push(`Category: ${activeFilters.category}`);
    if (activeFilters.culture)
      filters.push(`Culture: ${activeFilters.culture}`);
    if (activeFilters.department)
      filters.push(`Department: ${activeFilters.department}`);
    if (activeFilters.period) filters.push(`Period: ${activeFilters.period}`);
    if (activeFilters.tags) filters.push(`Tags: #${activeFilters.tags}`);
    if (activeFilters.artistName)
      filters.push(`Artist: ${activeFilters.artistName}`);

    if (filters.length === 0) return "All Artworks";
    if (filters.length === 1) return filters[0];
    return `Search with ${filters.length} filters`;
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setActiveFilters({});
    setCurrentPage(0);
    setSearchParams({});
    setHasSearched(false);
    fetchData(0, {});
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

      // Update URL if search was removed
      if (filterKey === "anyField" || Object.keys(newFilters).length === 0) {
        setSearchParams({});
      }
    }

    // Fetch new data
    const updatedFilters =
      filterKey === "search"
        ? activeFilters
        : (() => {
            const newFilters = { ...activeFilters };
            delete newFilters[filterKey as keyof typeof activeFilters];
            return newFilters;
          })();

    setCurrentPage(0);
    fetchData(0, updatedFilters);
  };

  // Check URL search parameters on mount
  useEffect(() => {
    const urlSearchQuery = searchParams.get("search");
    const urlTagsQuery = searchParams.get("tags");

    // Prevent processing if we're already in a loading state to avoid race conditions
    if (loading) {
      return;
    }

    if (urlTagsQuery) {
      // Handle tag-specific search with detailed search API

      // Only set activeFilters after we start the search to prevent circular effects
      const newFilters = { tags: urlTagsQuery };

      // Call detailed search directly here instead of using handleAdvancedSearch
      const performTagSearch = async () => {
        try {
          setLoading(true);

          const data = await searchDetailedArts({
            ...newFilters,
            page: 0,
            size: itemsPerPage,
          });

          setArtData(data);
          setActiveFilters(newFilters); // Set filters after successful search
          setCurrentPage(0);
          setHasSearched(true);
        } catch (err) {
          console.error("Tag search failed:", err);
          setArtData({
            content: [],
            totalPages: 1,
            totalElements: 0,
            number: 0,
            size: itemsPerPage,
          });
        } finally {
          setLoading(false);
        }
      };

      performTagSearch();
      // Return early to prevent other searches from running
      return;
    }

    if (urlSearchQuery) {
      setSearchQuery(urlSearchQuery);
      const newFilters = { anyField: urlSearchQuery };
      setActiveFilters(newFilters);
      setHasSearched(true);
      fetchData(0, newFilters);
      return;
    }

    // Only fetch all if no search params

    fetchData(0);
  }, [searchParams, itemsPerPage]);

  // Update URL when search query changes
  useEffect(() => {
    // Only update URL if we're not already on the correct URL to prevent circular effects
    const currentSearch = searchParams.get("search");
    const currentTags = searchParams.get("tags");

    if (
      searchQuery &&
      activeFilters.anyField === searchQuery &&
      currentSearch !== searchQuery
    ) {
      setSearchParams({ search: searchQuery });
    } else if (activeFilters.tags && currentTags !== activeFilters.tags) {
      setSearchParams({ tags: activeFilters.tags });
    } else if (
      !searchQuery &&
      !activeFilters.tags &&
      (currentSearch || currentTags)
    ) {
      setSearchParams({});
    }
  }, [
    searchQuery,
    activeFilters.anyField,
    activeFilters.tags,
    setSearchParams,
    searchParams,
  ]);

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Art Gallery
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Explore our collection of historical artworks. Rate your favorites
            and save pieces to watch later.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 bg-card p-6 rounded-lg shadow-soft">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search artworks, artists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
              onClick={() => navigate("/map-gallery")}
              className="text-emerald-700 border-emerald-700 hover:bg-emerald-50"
            >
              <Map className="h-4 w-4 mr-2" />
              Search with Map
            </Button>
          </div>
        </div>

        {/* Search Results Caption */}
        {hasSearched &&
          (searchQuery || Object.keys(activeFilters).length > 0) &&
          !loading && (
            <div className="mb-6 p-4 bg-gradient-to-r from-cream to-warm-white dark:from-slate-800 dark:to-slate-700 border border-brown-light/30 dark:border-slate-600 rounded-lg shadow-soft">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-2 h-2 bg-brown-medium rounded-full shadow-sm"></div>
                    <div>
                      <h3 className="font-semibold text-brown-dark dark:text-foreground">
                        Search Results
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {artData.totalElements}{" "}
                        {artData.totalElements === 1 ? "artwork" : "artworks"}{" "}
                        found
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
                          onClick={() => removeFilter(filter.key, filter.value)}
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
          )}

        {/* Gallery Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: itemsPerPage }).map((_, i) => (
              <Skeleton key={i} className="h-[400px] w-full" />
            ))}
          </div>
        ) : (
          <GalleryGrid
            artworks={artData.content}
            totalItems={artData.totalElements}
            totalPages={artData.totalPages}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            isLoading={loading}
          />
        )}

        {/* Advanced Search Dialog */}
        <AdvancedSearchDialog
          open={advancedSearchOpen}
          onOpenChange={setAdvancedSearchOpen}
          onSearch={handleAdvancedSearch}
        />
      </div>
    </div>
  );
}
