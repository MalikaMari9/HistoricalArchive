import { useState, useEffect } from 'react';
import { ArtCard } from './ArtCard';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Artifact, ArtifactImage } from '@/pages/artifacts/Gallery';


interface GalleryGridProps {
  artworks: Artifact[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;

  
}



export const GalleryGrid = ({
  artworks,
  totalItems,
  totalPages,
  currentPage,
  onPageChange,
  isLoading
}: GalleryGridProps) => {
  const [watchedItems, setWatchedItems] = useState<Set<string>>(new Set());
  const itemsPerPage = 6;

  const handleRate = (artId: string, rating: number) => {
    console.log(`Rated ${artId} with ${rating} stars`);
  };

  useEffect(() => {
  console.log("🔍 Loaded Artifacts:");
  artworks.forEach((a) => {
    console.log({
      _id: a._id,
      title: a.title,
      image_url: a.image_url,
      image_from_images: a.images?.[0]?.baseimageurl,
    });
  });
}, [artworks]);


  const handleToggleWatchLater = (artId: string) => {
    setWatchedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(artId)) {
        newSet.delete(artId);
      } else {
        newSet.add(artId);
      }
      return newSet;
    });
  };

  const goToPage = (page: number) => {
    onPageChange(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading artifacts...</div>;
  }

  if (artworks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-muted-foreground">No artifacts found</p>
        <Button variant="outline" onClick={() => goToPage(0)}>
          Reset
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">
          Showing {(currentPage * itemsPerPage) + 1}–
          {Math.min((currentPage + 1) * itemsPerPage, totalItems)} of {totalItems} artifacts
        </p>
        <p className="text-muted-foreground">Page {currentPage + 1} of {totalPages}</p>
      </div>

      {/* Artifacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {artworks.map((artifact) => (
          <ArtCard
            key={artifact._id}
            _id={artifact._id}
            id={artifact._id}
            title={artifact.title}
            artist={artifact.culture}
            culture={artifact.culture}
            period={artifact.period}
            category={artifact.category}
            description={artifact.description}
            medium={artifact.medium}
            image={
  artifact.image_url?.trim() ||
  artifact.images?.[0]?.baseimageurl?.trim() ||
  '/default-artifact.png'
}


            images={artifact.images}
            location={artifact.location}
            rating={artifact.averageRating}
            totalRatings={artifact.totalRatings}
            isWatchLater={watchedItems.has(artifact._id)}
            onRate={handleRate}
            onToggleWatchLater={handleToggleWatchLater}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <div className="flex space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNumber;
              if (totalPages <= 5) {
                pageNumber = i;
              } else if (currentPage <= 2) {
                pageNumber = i;
              } else if (currentPage >= totalPages - 3) {
                pageNumber = totalPages - 5 + i;
              } else {
                pageNumber = currentPage - 2 + i;
              }

              return (
                <Button
                  key={pageNumber}
                  variant={currentPage === pageNumber ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => goToPage(pageNumber)}
                  className="w-10"
                >
                  {pageNumber + 1}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages - 1}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
