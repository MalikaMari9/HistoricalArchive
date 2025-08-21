import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { AdvancedSearchDialog } from "@/components/gallery/AdvancedSearchDialog";
import { searchArts, SearchFilters } from "@/services/api";
import { Skeleton } from "@/components/ui/skeleton";
import { searchDetailedArts } from "@/services/api"; 

console.log("🖼️ Gallery component rendered");


export default function Gallery() {
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

  const [activeFilters, setActiveFilters] = useState<Omit<SearchFilters, 'page' | 'size'>>({});
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
    fetchData(0, newFilters); // only one call
  };

const handleAdvancedSearch = async (newFilters: Omit<SearchFilters, 'page' | 'size'>) => {
  const formattedFilters = {
    ...newFilters,
    fromDate: newFilters.fromDate ? new Date(newFilters.fromDate).toISOString().split("T")[0] : undefined,
    toDate: newFilters.toDate ? new Date(newFilters.toDate).toISOString().split("T")[0] : undefined,
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
    fetchData(page, activeFilters);
  };

  useEffect(() => {
    // No automatic fetch on mount
    fetchData(0);
  }, []);

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Art Gallery</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Explore our collection of historical artworks. Rate your favorites and save pieces to watch later.
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
          </div>
        </div>

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
