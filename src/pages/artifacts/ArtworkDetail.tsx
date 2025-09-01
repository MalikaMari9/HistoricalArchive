import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import axios from "axios";
import {
  ArrowLeft,
  Bookmark,
  Download,
  Hash,
  Heart,
  MessageCircle,
  Share2,
  Star,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

// ✅ axios helpers
import {
  getArtifactById,
  getArtifactRatingInfo,
  getCommentsByArtifact,
  postComment,
  reactToComment,
  removeRating,
  submitRating,
  type ArtifactDetail,
  type CommentDTO,
  type RatingDTO,
  deleteComment,
  getArtifactStatus,
  checkBookmark,
  createBookmark,
  deleteBookmark,
  getUserArtifactStatus, getUserArtifact, type UserArtifactDTO,
} from "@/services/api";

type AppStatus = "pending" | "accepted" | "rejected";

interface ArtworkImage {
  date?: string;
  copyright?: string;
  imageid?: number;
  idsid?: number;
  format?: string;
  description?: string | null;
  technique?: string | null;
  renditionnumber?: string;
  displayorder?: number;
  baseimageurl: string;
  alttext?: string | null;
  width?: number;
  publiccaption?: string | null;
  iiifbaseuri?: string;
  height?: number;
}

interface Artwork {
  _id: string;
  title: string;
  description?: string | null;
  category?: string;
  culture?: string | null;
  department?: string | null;
  period?: string | null;
  exact_found_date?: string | null;
  medium?: string | null;
  dimension?: string | null;
  tags?: string[] | null;
  location?: Record<string, any>;
  uploaded_by?: string;
  uploaded_at?: string;
  updated_at?: string;
  images?: ArtworkImage[];
  averageRating?: number;
  totalRatings?: number;
  artist_name?: string;
  image_url?: string;
  status?: AppStatus;
}

interface Comment {
  commentId: number;
  comment: string;
  userId: number;
  username: string;
  createdAt: string;
  replies?: Comment[];
  parentId?: number;
  reactionCount: number;
  isReacted?: boolean;
}

// Recursive Comment Component
const CommentItem = ({ 
  comment, 
  onReply, 
  onReact, 
  onDelete, 
  currentUser, 
  isReacting,
  depth = 0 
}: {
  comment: Comment;
  onReply: (parentId: number, content: string) => Promise<void>;
  onReact: (commentId: number) => Promise<void>;
  onDelete: (commentId: number) => Promise<void>;
  currentUser: any;
  isReacting: boolean;
  depth?: number;
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);

  const handlePostReply = async () => {
    if (!replyContent.trim()) return;
    
    setIsPosting(true);
    try {
      await onReply(comment.commentId, replyContent);
      setReplyContent("");
      setIsReplying(false);
    } finally {
      setIsPosting(false);
    }
  };

  const displayedReplies = showAllReplies ? comment.replies : (comment.replies || []).slice(0, 2);
  const hasMoreReplies = (comment.replies?.length || 0) > 2;

  return (
    <div className={`flex items-start gap-3 ${depth > 0 ? 'mt-4' : ''}`}>
      <div className="flex-shrink-0">
        <Avatar className="w-10 h-10">
          <AvatarFallback>{comment.username[0]?.toUpperCase() || 'U'}</AvatarFallback>
        </Avatar>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h5 className="font-medium text-sm">{comment.username}</h5>
          <span className="text-xs text-muted-foreground">
            {new Date(comment.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <p className="text-sm text-foreground mt-1">{comment.comment}</p>
        
        <div className="flex items-center gap-4 mt-2">
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => onReact(comment.commentId)}
            disabled={isReacting}
          >
            <Heart
              className={`w-4 h-4 ${
                comment.isReacted ? "fill-red-500 text-red-500" : ""
              }`}
            />
            <span>{comment.reactionCount}</span>
          </button>
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setIsReplying(!isReplying)}
          >
            Reply
          </button>
          {currentUser?.userId === comment.userId && (
            <button
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              onClick={() => onDelete(comment.commentId)}
              aria-label="Delete comment"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {isReplying && (
          <div className="mt-4 space-y-2">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write your reply..."
              className="w-full text-sm p-2 border rounded"
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handlePostReply}
                disabled={!replyContent.trim() || isPosting}
              >
                {isPosting ? "Posting..." : "Post Reply"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReplying(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {displayedReplies && displayedReplies.length > 0 && (
          <div className={`mt-3 pl-6 border-l-2 border-muted ${depth >= 3 ? 'ml-0 pl-4 border-l-0' : ''}`}>
            {displayedReplies.map((reply) => (
              <CommentItem
                key={reply.commentId}
                comment={reply}
                onReply={onReply}
                onReact={onReact}
                onDelete={onDelete}
                currentUser={currentUser}
                isReacting={isReacting}
                depth={depth + 1}
              />
            ))}
          </div>
        )}

        {hasMoreReplies && (
          <Button 
            variant="ghost" 
            size="sm"
            className="flex items-center gap-1 text-xs text-muted-foreground mt-3"
            onClick={() => setShowAllReplies(!showAllReplies)}
          >
            {showAllReplies ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Hide replies
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                Show all {comment.replies?.length} replies
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default function ArtworkDetail() {
  const { _id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser } = useCurrentUser();

  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [isReacting, setIsReacting] = useState(false);

  const [userRating, setUserRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [isRating, setIsRating] = useState(false);
  const [isRemovingRating, setIsRemovingRating] = useState(false);

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Update the useEffect hook that loads artwork data
useEffect(() => {
  if (!_id) return;

  const loadArtworkData = async () => {
    try {
      setIsLoading(true);

      // Artifact details
      const art: ArtifactDetail = await getArtifactById(_id);
      const normalizedArtwork = normalizeArtworkData(art);
      setArtwork(normalizedArtwork);

      // Comments
      const cms: CommentDTO[] = await getCommentsByArtifact(_id);
      setComments(cms as unknown as Comment[]);

      // Rating summary (+ userRating if logged in)
      const rating: RatingDTO = await getArtifactRatingInfo(_id);
      setArtwork((prev) =>
        prev
          ? {
              ...prev,
              averageRating: rating.averageRating ?? 0,
              totalRatings: rating.totalRatings ?? 0,
            }
          : prev
      );
      if (rating.userRating != null) setUserRating(rating.userRating);

      // Check if artifact is bookmarked (if user is logged in)
      if (currentUser?.userId) {
        const bookmarked = await checkBookmark(_id);
        setIsBookmarked(bookmarked);
      }

      // Load artifact status - different logic for professors vs regular users
// Load artifact status
if (currentUser?.userId && normalizedArtwork?.uploaded_by) {
  const isOwner =
    currentUser.role === "curator" &&
    (currentUser.username === normalizedArtwork.uploaded_by);

  try {
    if (isOwner) {
      // Only the artifact owner can use the user-specific status API
      const userArtifactStatus = await getUserArtifactStatus(_id, currentUser.userId);
      if (userArtifactStatus) {
        setArtwork((prev) =>
          prev
            ? {
                ...prev,
                status: (userArtifactStatus.toLowerCase() as AppStatus) || "pending",
              }
            : prev
        );
      }
    } else if (currentUser.role === "professor") {
      // Professors see artifact-level status
      const artifactStatuses = await getArtifactStatus(_id);
      if (artifactStatuses.length > 0) {
        const firstStatus = artifactStatuses[0];
        setArtwork((prev) =>
          prev
            ? {
                ...prev,
                status: (firstStatus.status?.toLowerCase() as AppStatus) || "pending",
              }
            : prev
        );
      }
    }
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      console.warn("User has no status record for this artifact.");
    } else {
      console.error("Error loading artifact status:", err);
    }
  }
}


    } catch (err) {
      console.error("Error loading artwork detail:", err);
      toast({
        title: "Error",
        description: "Could not load artwork details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsLoadingStatus(false);
    }
  };

  loadArtworkData();
}, [_id, toast, currentUser?.userId, currentUser?.role]);

  const normalizeArtworkData = (data: any): Artwork => ({
    _id: data._id ?? data.id ?? data.artifactId,
    title: data.title || "Untitled",
    description: data.description || null,
    category: data.category || null,
    culture: data.culture || null,
    department: data.department || null,
    period: data.period || null,
    exact_found_date: data.exact_found_date || null,
    medium: data.medium || null,
    dimension: data.dimension || null,
    tags: data.tags || null,
    location: data.location || {},
    uploaded_by: data.uploaded_by || data.artist_name || "Unknown",
    uploaded_at: data.uploaded_at,
    updated_at: data.updated_at,
    images: (data.images || []).map((img: any) => ({
      ...img,
      baseimageurl:
        img.baseimageurl ||
        getImageUrlFromHarvard(img) ||
        "/placeholder-art.jpg",
    })),
    image_url: data.image_url || null,
    artist_name: data.artist_name || data.uploaded_by,
    averageRating: data.averageRating || 0,
    totalRatings: data.totalRatings || 0,
    status: (data.status?.toLowerCase() || 'pending') as AppStatus,
  });

  const getImageUrlFromHarvard = (img: any): string | null => {
    if (img.iiifbaseuri) return `${img.iiifbaseuri}/full/full/0/default.jpg`;
    if (img.idsid && img.renditionnumber)
      return `https://ids.lib.harvard.edu/ids/view/${img.idsid}/${img.renditionnumber}`;
    return null;
  };

  const handleBookmarkToggle = async () => {
    if (!currentUser?.userId) {
      toast({
        title: "Error",
        description: "You must be logged in to save artifacts",
        variant: "destructive",
      });
      return;
    }

    if (!_id) return;

    setIsBookmarkLoading(true);
    try {
      if (isBookmarked) {
        await deleteBookmark(_id);
        setIsBookmarked(false);
        toast({
          title: "Success",
          description: "Artifact removed from saved items",
        });
      } else {
        await createBookmark(_id);
        setIsBookmarked(true);
        toast({
          title: "Success",
          description: "Artifact saved successfully",
        });
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      toast({
        title: "Error",
        description: "Could not update bookmark",
        variant: "destructive",
      });
    } finally {
      setIsBookmarkLoading(false);
    }
  };

  /* ------------------------------ Ratings logic ------------------------------ */
  const handleStarClick = async (starRating: number) => {
    if (!currentUser?.userId) {
      toast({
        title: "Error",
        description: "You must be logged in to rate artworks",
        variant: "destructive",
      });
      return;
    }
    if (!_id) return;

    setIsRating(true);
    try {
      const data = await submitRating({
        artifactId: _id,
        ratingValue: starRating,
      });
      if (data.success) {
        setUserRating(starRating);
        setArtwork((prev) =>
          prev
            ? {
                ...prev,
                averageRating: data.averageRating,
                totalRatings: data.totalRatings,
              }
            : prev
        );
        toast({
          title: "Success",
          description: "Rating submitted successfully",
        });
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast({
        title: "Error",
        description: "Could not submit rating",
        variant: "destructive",
      });
    } finally {
      setIsRating(false);
    }
  };

  const handleRemoveRating = async () => {
    if (!currentUser?.userId) {
      toast({
        title: "Error",
        description: "You must be logged in to remove a rating",
        variant: "destructive",
      });
      return;
    }
    if (!userRating || !_id) {
      toast({
        title: "Error",
        description: "You have no rating to remove",
        variant: "destructive",
      });
      return;
    }

    setIsRemovingRating(true);
    try {
      const data = await removeRating(_id);
      if (data.success) {
        setUserRating(0);
        setArtwork((prev) =>
          prev
            ? {
                ...prev,
                averageRating: data.averageRating,
                totalRatings: data.totalRatings,
              }
            : prev
        );
        toast({ title: "Success", description: "Rating removed successfully" });
      }
    } catch (error) {
      console.error("Error removing rating:", error);
      toast({
        title: "Error",
        description: "Could not remove rating",
        variant: "destructive",
      });
    } finally {
      setIsRemovingRating(false);
    }
  };

  const renderRatingSection = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-4 h-4 ${
                star <= Math.floor(artwork?.averageRating || 0)
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/40"
              }`}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">
          {(artwork?.averageRating ?? 0).toFixed(1)} (
          {artwork?.totalRatings ?? 0} ratings)
        </span>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Your Rating:</p>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              className="transition-transform hover:scale-110"
              disabled={isRating}
            >
              <Star
                className={`w-5 h-5 ${
                  star <= (hoveredStar || userRating)
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/40"
                }`}
              />
            </button>
          ))}
          {userRating > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={handleRemoveRating}
              disabled={isRemovingRating}
            >
              Remove Rating
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  /* ------------------------------- Misc helpers ------------------------------ */
  const getUploadDate = (): string => {
    if (!artwork?.uploaded_at) return "Unknown date";
    try {
      return new Date(artwork.uploaded_at).toLocaleDateString();
    } catch {
      return "Unknown date";
    }
  };

  const getLocationString = (): string | null => {
    if (!artwork?.location || Object.keys(artwork.location).length === 0)
      return null;
    const parts = [
      artwork.location.city,
      artwork.location.region,
      artwork.location.country,
      artwork.location.continent,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const handleTagClick = (tag: string) => {
    navigate(`/gallery?tags=${encodeURIComponent(tag)}`);
  };

  const getStatusColor = (status: AppStatus | undefined) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-300";
      case "rejected":
        return "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-300";
      case "pending":
      default:
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300";
    }
  };

  /* --------------------------------- Comments -------------------------------- */
  const handleReact = async (commentId: number) => {
    if (!currentUser?.userId) {
      toast({
        title: "Error",
        description: "You must be logged in to react to comments",
        variant: "destructive",
      });
      return;
    }

    setIsReacting(true);
    try {
      const data = await reactToComment({
        commentId,
        userId: currentUser.userId,
      });
      if (data?.success) {
        setComments((prev) => updateCommentReaction(prev, commentId, data));
      }
    } catch (error) {
      console.error("Error toggling reaction:", error);
      toast({
        title: "Error",
        description: "Could not react to comment",
        variant: "destructive",
      });
    } finally {
      setIsReacting(false);
    }
  };

  const updateCommentReaction = (
    list: Comment[],
    commentId: number,
    reactionData: { reactionCount: number; isReacted: boolean }
  ): Comment[] =>
    list.map((c) => {
      if (c.commentId === commentId) {
        return {
          ...c,
          reactionCount: reactionData.reactionCount,
          isReacted: reactionData.isReacted,
        };
      }
      if (c.replies?.length) {
        return {
          ...c,
          replies: updateCommentReaction(c.replies, commentId, reactionData),
        };
      }
      return c;
    });

  const handlePostComment = async (parentId: number | null, content: string) => {
    if (!currentUser?.userId) {
      toast({
        title: "Error",
        description: "You must be logged in to comment",
        variant: "destructive",
      });
      return;
    }
    if (!_id) return;

    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Comment cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setIsPosting(true);
    try {
      const data = await postComment({
        artifactId: _id,
        content,
        parentId: parentId || undefined,
      });

      const newComment: Comment = {
        commentId: data.commentId,
        comment: data.comment,
        userId: data.userId,
        username: currentUser.username,
        createdAt: data.createdAt,
        reactionCount: 0,
        isReacted: false,
        replies: [],
      };

      if (parentId) {
        const addReplyToComment = (comments: Comment[]): Comment[] => {
          return comments.map(comment => {
            if (comment.commentId === parentId) {
              return {
                ...comment,
                replies: [newComment, ...(comment.replies || [])],
              };
            }
            if (comment.replies) {
              return {
                ...comment,
                replies: addReplyToComment(comment.replies),
              };
            }
            return comment;
          });
        };
        
        setComments(addReplyToComment(comments));
      } else {
        setComments(prev => [newComment, ...prev]);
        setNewComment("");
      }

      toast({ title: "Success", description: "Comment posted successfully" });
    } catch (error) {
      console.error("Error posting comment:", error);
      toast({
        title: "Error",
        description: "Could not post comment",
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
    }
  };

  const removeCommentFromTree = (comments: Comment[], commentId: number): Comment[] => {
    return comments
      .filter(comment => comment.commentId !== commentId)
      .map(comment => ({
        ...comment,
        replies: comment.replies ? removeCommentFromTree(comment.replies, commentId) : [],
      }));
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!currentUser?.userId) {
      toast({
        title: "Error",
        description: "You must be logged in to delete comments",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await deleteComment(commentId);
      if (result.success) {
        setComments(prev => removeCommentFromTree(prev, commentId));
        toast({ title: "Success", description: "Comment deleted successfully" });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to delete comment",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast({
        title: "Error",
        description: "Could not delete comment",
        variant: "destructive",
      });
    }
  };

  const countTotalComments = (comments: Comment[]): number => {
    return comments.reduce((total, comment) => {
      return total + 1 + (comment.replies ? countTotalComments(comment.replies) : 0);
    }, 0);
  };

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );

  if (!artwork) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Artwork not found</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go back
          </Button>
        </div>
      </div>
    );
  }

  const locationString = getLocationString();
  const mainImage =
    artwork.image_url ||
    artwork.images?.[selectedImageIndex]?.baseimageurl ||
    "/default-artifact.png";

  const artistName =
    artwork.artist_name || artwork.uploaded_by || "Unknown artist";
    
  const statusLabel = artwork.status ? artwork.status.charAt(0).toUpperCase() + artwork.status.slice(1) : 'Pending';

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container flex items-center gap-4 h-16">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-semibold text-lg truncate">{artwork.title}</h1>
                
          {isLoadingStatus ? (
  <Badge className="ml-auto bg-gray-100 text-gray-800 animate-pulse">
    Loading...
  </Badge>
) : (
  (currentUser?.role === 'professor' || currentUser?.username === artwork.uploaded_by) && /^a_[a-zA-Z0-9]+$/.test(artwork._id) && 
  artwork.status && (
    <Badge className={`ml-auto ${getStatusColor(artwork.status)}`}>
      {statusLabel}
      {artwork.status === 'pending' && (
        <span className="ml-1 animate-pulse">•</span>
      )}
    </Badge>
  )
)}
        </div>
      </div>

      <div className="container py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: media + description + comments */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
<div className="aspect-[4/3] relative bg-muted flex items-center justify-center">
  <img
    src={mainImage}
    alt={artwork.images?.[selectedImageIndex]?.alttext || artwork.title}
    className="max-w-full max-h-full object-contain"
    onError={(e) =>
      ((e.target as HTMLImageElement).src = "/placeholder-art.jpg")
    }
  />
</div>

            </Card>

            {artwork.images && artwork.images.length > 1 && (
              <div className="mt-6 grid grid-cols-5 gap-4">
                {artwork.images.map((image, index) => (
                  <div
                    key={image.imageid || index}
                    className={`cursor-pointer group relative overflow-hidden rounded-lg border-2 transition-all duration-300 ${
                      selectedImageIndex === index
                        ? "border-primary shadow-lg"
                        : "border-transparent hover:border-muted-foreground/30"
                    }`}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={image.baseimageurl}
                        alt={
                          image.alttext || `${artwork.title} view ${index + 1}`
                        }
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) =>
                          ((e.target as HTMLImageElement).src =
                            "/placeholder-art.jpg")
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Card className="mt-6">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Description</h3>
                <p className="text-muted-foreground">
                  {artwork.description || "No description available"}
                </p>
                {artwork.tags && artwork.tags.length > 0 && (
                  <div className="mt-6 p-3 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg border">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-primary/10 rounded-full">
                        <Hash className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-base text-foreground">
                          Tags
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Click to explore similar artworks
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {artwork.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-sm px-3 py-1.5 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all duration-200 font-medium border border-transparent hover:border-primary hover:shadow-md hover:scale-102 transform"
                          onClick={() => handleTagClick(tag)}
                        >
                          <Hash className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <MessageCircle className="h-5 w-5" />
                  <h3 className="font-semibold">
                    Comments ({countTotalComments(comments)})
                  </h3>
                </div>

                <div className="space-y-6">
                  {comments.length > 0 ? (
                    comments.map((comment) => (
                      <CommentItem
                        key={comment.commentId}
                        comment={comment}
                        onReply={handlePostComment}
                        onReact={handleReact}
                        onDelete={handleDeleteComment}
                        currentUser={currentUser}
                        isReacting={isReacting}
                      />
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No comments yet. Be the first to share your thoughts!
                    </p>
                  )}
                </div>

                <Separator className="my-6" />

                <div className="space-y-4">
                  <h4 className="font-medium">Add a comment</h4>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your thoughts about this artwork..."
                    className="w-full text-sm p-2 border rounded min-h-[100px]"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={() => handlePostComment(null, newComment)}
                      disabled={!newComment.trim() || isPosting}
                    >
                      {isPosting ? "Posting..." : "Post Comment"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: facts */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{artwork.title}</h2>
                  <p className="text-muted-foreground">
                    {artistName}
                    {(artwork.culture || artwork.period) && " • "}
                    {artwork.culture} {artwork.culture && artwork.period && "•"}{" "}
                    {artwork.period}
                  </p>
                </div>

                <Separator />

                {renderRatingSection()}

                <Separator />

                <div className="space-y-3">
                  {artwork.medium && (
                    <div>
                      <h4 className="font-medium text-sm">Medium</h4>
                      <p className="text-sm text-muted-foreground">
                        {artwork.medium}
                      </p>
                    </div>
                  )}
                  {artwork.dimension && (
                    <div>
                      <h4 className="font-medium text-sm">Dimensions</h4>
                      <p className="text-sm text-muted-foreground">
                        {artwork.dimension}
                      </p>
                    </div>
                  )}
                  {artwork.department && (
                    <div>
                      <h4 className="font-medium text-sm">Department</h4>
                      <p className="text-sm text-muted-foreground">
                        {artwork.department}
                      </p>
                    </div>
                  )}
                  {artwork.exact_found_date && (
                    <div>
                      <h4 className="font-medium text-sm">Date</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(
                          artwork.exact_found_date
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {locationString && (
                    <div>
                      <h4 className="font-medium text-sm">Location</h4>
                      <p className="text-sm text-muted-foreground">
                        {locationString}
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="text-sm text-muted-foreground">
                  <p>Uploaded by: {artwork.uploaded_by}</p>
                  <p>Uploaded on: {getUploadDate()}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleBookmarkToggle}
                    disabled={isBookmarkLoading}
                  >
                    <Bookmark className={`h-4 w-4 mr-2 ${isBookmarked ? "fill-primary text-primary" : ""}`} />
                    {isBookmarked ? "Saved" : "Save"}
                  </Button>
                  
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={mainImage}
                      download={`${artwork.title.replace(/\s+/g, "_")}.jpg`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}