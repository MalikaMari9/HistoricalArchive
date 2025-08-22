import { useState, useEffect } from "react";
import { ArrowLeft, Heart, Bookmark as BookmarkIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArtCard } from "@/components/gallery/ArtCard";

import { useToast } from "@/components/ui/use-toast";
import { ArtifactImage } from "@/pages/artifacts/Gallery";
import { useAuth } from "@/hooks/useAuth";
// Centralized API helpers
import {
  listBookmarks,
  getArtifactById,
  getArtifactRatingInfo,
  deleteBookmark as apiDeleteBookmark,
  type RatingDTO,
} from "@/services/api";

type ArtifactSummary = {
  _id?: string;
  id?: string;
  artifactId?: string;

  title: string;
  culture?: string;
  period?: string;
  category?: string;
  description?: string;
  medium?: string;

  images?: ArtifactImage[];
  image_url?: string;
  location?: { city?: string; country?: string; continent?: string };

  averageRating?: number;
  totalRatings?: number;
  artist_name?: string;
};

export default function Bookmarks() {
  const navigate = useNavigate();
const { user, isAuthenticated, loading: authLoading } = useAuth();

  const { toast } = useToast();
  const [bookmarkedArtworks, setBookmarkedArtworks] = useState<ArtifactSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // axios cancellation token (equivalent idea to AbortController for fetch)
    const controller = new AbortController();

    const fetchBookmarks = async () => {
      try {
        setLoading(true);

        // 1) Get bookmark rows
        const bookmarkDTOs = await listBookmarks();

        // 2) For each bookmark: fetch artifact + rating in parallel
        const artifacts = await Promise.all(
          bookmarkDTOs.map(async ({ artifactId }) => {
            // parallelize: artifact + rating
            const [artifactData, ratingDataOrNull] = await Promise.all([
              getArtifactById(artifactId),
              getArtifactRatingInfo(artifactId)
                .then((d) => d)
                .catch(() => null), // ratings may be absent
            ]);

            // normalize for ArtCard
            const ratingData = ratingDataOrNull as RatingDTO | null;
            const normalized: ArtifactSummary = {
              ...artifactData,
              _id: artifactData._id ?? artifactData.id ?? artifactId,
              artifactId: artifactData.artifactId ?? artifactId,
              images: (artifactData.images ?? []) as ArtifactImage[],
              averageRating: ratingData?.averageRating ?? artifactData.averageRating ?? 0,
              totalRatings: ratingData?.totalRatings ?? artifactData.totalRatings ?? 0,
            };

            return normalized;
          })
        );

        setBookmarkedArtworks(artifacts.filter(Boolean));
      } catch (error: any) {
        if (error?.name !== "CanceledError") {
          console.error("Error fetching bookmarks:", error);
          toast({
            title: "Error",
            description: "Failed to load bookmarks",
            variant: "destructive",
          });
        }
      } finally {
        setLoading(false);
      }
    };

    if (user && isAuthenticated) fetchBookmarks();

    return () => controller.abort();
}, [user, isAuthenticated, toast]);

  const handleToggleBookmark = async (artifactId: string) => {
    try {
      await apiDeleteBookmark(artifactId);

      setBookmarkedArtworks((prev) =>
        prev.filter((art) => (art._id ?? art.id ?? art.artifactId) !== artifactId)
      );

      toast({ title: "Success", description: "Bookmark removed successfully" });
    } catch (error) {
      console.error("Error removing bookmark:", error);
      toast({
        title: "Error",
        description: "Failed to remove bookmark",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading bookmarks...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <BookmarkIcon className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">My Bookmarks</h1>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-muted-foreground">
            {bookmarkedArtworks.length} bookmark
            {bookmarkedArtworks.length !== 1 ? "s" : ""} found
          </p>
        </div>

        {/* Bookmarks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookmarkedArtworks.map((artifact) => {
            const artId = artifact._id ?? artifact.id ?? artifact.artifactId!;
            return (
              <ArtCard
                key={artId}
                _id={artId}
                id={artId}
                title={artifact.title}
                artist={artifact.artist_name || artifact.culture}
                culture={artifact.culture}
                period={artifact.period}
                category={artifact.category}
                description={artifact.description}
                medium={artifact.medium}
                image={
                  artifact.image_url?.trim() ||
                  artifact.images?.[0]?.baseimageurl?.trim() ||
                  "/default-artifact.png"
                }
                images={artifact.images}
                location={artifact.location}
                // Prefilled ratings (ArtCard may still refresh itself)
                averageRating={artifact.averageRating ?? 0}
                userCount={artifact.totalRatings ?? 0}
                rating={artifact.averageRating ?? 0}
                totalRatings={artifact.totalRatings ?? 0}
                initialBookmarked={true}
                onBookmarkChange={(nowBookmarked) => {
                  if (!nowBookmarked) handleToggleBookmark(artId);
                }}
              />
            );
          })}
        </div>

        {/* Empty State */}
        {bookmarkedArtworks.length === 0 && (
          <div className="text-center py-12">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No bookmarks yet</h3>
            <p className="text-muted-foreground">
              Start exploring artworks and bookmark your favorites.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate("/gallery")}
            >
              Browse Gallery
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
