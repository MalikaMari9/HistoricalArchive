import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Bookmark, Heart, MessageCircle, Share2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';

// ✅ axios helpers
import {
  getArtifactById,
  getArtifactRatingInfo,
  getCommentsByArtifact,
  postComment,
  reactToComment,
  submitRating,
  removeRating,
  type ArtifactDetail,
  type CommentDTO,
  type RatingDTO,
} from '@/services/api';

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

export default function ArtworkDetail() {
  const { _id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser } = useCurrentUser();

  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isReacting, setIsReacting] = useState(false);

  const [userRating, setUserRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [isRating, setIsRating] = useState(false);
  const [isRemovingRating, setIsRemovingRating] = useState(false);

  useEffect(() => {
    if (!_id) return;

    const load = async () => {
      try {
        setIsLoading(true);

        // Artifact details
        const art: ArtifactDetail = await getArtifactById(_id);
        setArtwork(normalizeArtworkData(art));

        // Comments
        const cms: CommentDTO[] = await getCommentsByArtifact(_id);
        setComments(cms as unknown as Comment[]);

        // Rating summary (+ userRating if logged in)
        const rating: RatingDTO = await getArtifactRatingInfo(_id);
        setArtwork(prev =>
          prev
            ? { ...prev, averageRating: rating.averageRating ?? 0, totalRatings: rating.totalRatings ?? 0 }
            : prev
        );
        if (rating.userRating != null) setUserRating(rating.userRating);
      } catch (err) {
        console.error('Error loading artwork detail:', err);
        toast({ title: 'Error', description: 'Could not load artwork details', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [_id, toast]);

  const normalizeArtworkData = (data: any): Artwork => ({
    _id: data._id ?? data.id ?? data.artifactId,
    title: data.title || 'Untitled',
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
    uploaded_by: data.uploaded_by || data.artist_name || 'Unknown',
    uploaded_at: data.uploaded_at,
    updated_at: data.updated_at,
    images: (data.images || []).map((img: any) => ({
      ...img,
      baseimageurl: img.baseimageurl || getImageUrlFromHarvard(img) || '/placeholder-art.jpg',
    })),
    image_url: data.image_url || null,
    artist_name: data.artist_name || data.uploaded_by,
    averageRating: data.averageRating || 0,
    totalRatings: data.totalRatings || 0,
  });

  const getImageUrlFromHarvard = (img: any): string | null => {
    if (img.iiifbaseuri) return `${img.iiifbaseuri}/full/full/0/default.jpg`;
    if (img.idsid && img.renditionnumber) return `https://ids.lib.harvard.edu/ids/view/${img.idsid}/${img.renditionnumber}`;
    return null;
  };

  /* ------------------------------ Ratings logic ------------------------------ */

  const handleStarClick = async (starRating: number) => {
    if (!currentUser?.userId) {
      toast({ title: 'Error', description: 'You must be logged in to rate artworks', variant: 'destructive' });
      return;
    }
    if (!_id) return;

    setIsRating(true);
    try {
      const data = await submitRating({ artifactId: _id, ratingValue: starRating });
      if (data.success) {
        setUserRating(starRating);
        setArtwork(prev => (prev ? { ...prev, averageRating: data.averageRating, totalRatings: data.totalRatings } : prev));
        toast({ title: 'Success', description: 'Rating submitted successfully' });
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast({ title: 'Error', description: 'Could not submit rating', variant: 'destructive' });
    } finally {
      setIsRating(false);
    }
  };

  const handleRemoveRating = async () => {
    if (!currentUser?.userId) {
      toast({ title: 'Error', description: 'You must be logged in to remove a rating', variant: 'destructive' });
      return;
    }
    if (!userRating || !_id) {
      toast({ title: 'Error', description: 'You have no rating to remove', variant: 'destructive' });
      return;
    }

    setIsRemovingRating(true);
    try {
      const data = await removeRating(_id);
      if (data.success) {
        setUserRating(0);
        setArtwork(prev => (prev ? { ...prev, averageRating: data.averageRating, totalRatings: data.totalRatings } : prev));
        toast({ title: 'Success', description: 'Rating removed successfully' });
      }
    } catch (error) {
      console.error('Error removing rating:', error);
      toast({ title: 'Error', description: 'Could not remove rating', variant: 'destructive' });
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
                star <= Math.floor(artwork?.averageRating || 0) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'
              }`}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">
          {(artwork?.averageRating ?? 0).toFixed(1)} ({artwork?.totalRatings ?? 0} ratings)
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
                className={`w-5 h-5 ${star <= (hoveredStar || userRating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'}`}
              />
            </button>
          ))}
          {userRating > 0 && (
            <Button variant="outline" size="sm" className="ml-2" onClick={handleRemoveRating} disabled={isRemovingRating}>
              Remove Rating
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  /* ------------------------------- Misc helpers ------------------------------ */

  const getUploadDate = (): string => {
    if (!artwork?.uploaded_at) return 'Unknown date';
    try {
      return new Date(artwork.uploaded_at).toLocaleDateString();
    } catch {
      return 'Unknown date';
    }
  };

  const getLocationString = (): string | null => {
    if (!artwork?.location || Object.keys(artwork.location).length === 0) return null;
    const parts = [artwork.location.city, artwork.location.region, artwork.location.country, artwork.location.continent].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  /* --------------------------------- Comments -------------------------------- */

  const handleReact = async (commentId: number) => {
    if (!currentUser?.userId) {
      toast({ title: 'Error', description: 'You must be logged in to react to comments', variant: 'destructive' });
      return;
    }

    setIsReacting(true);
    try {
      const data = await reactToComment({ commentId, userId: currentUser.userId });
      if (data?.success) {
        setComments(prev => updateCommentReaction(prev, commentId, data));
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
      toast({ title: 'Error', description: 'Could not react to comment', variant: 'destructive' });
    } finally {
      setIsReacting(false);
    }
  };

  const updateCommentReaction = (list: Comment[], commentId: number, reactionData: { reactionCount: number; isReacted: boolean }): Comment[] =>
    list.map(c => {
      if (c.commentId === commentId) return { ...c, reactionCount: reactionData.reactionCount, isReacted: reactionData.isReacted };
      if (c.replies?.length) return { ...c, replies: updateCommentReaction(c.replies, commentId, reactionData) };
      return c;
    });

  const handlePostComment = async () => {
    if (!currentUser?.userId) {
      toast({ title: 'Error', description: 'You must be logged in to comment', variant: 'destructive' });
      return;
    }
    if (!_id) return;

    const content = replyingTo ? replyContent : newComment;
    if (!content.trim()) {
      toast({ title: 'Error', description: 'Comment cannot be empty', variant: 'destructive' });
      return;
    }

    setIsPosting(true);
    try {
      const data = await postComment({ artifactId: _id, content, parentId: replyingTo || undefined });

      const newC: Comment = {
        commentId: data.commentId,
        comment: data.comment,
        userId: data.userId,
        username: currentUser.username,
        createdAt: data.createdAt,
        reactionCount: 0,
        isReacted: false,
        replies: [],
      };

      if (replyingTo) {
        setComments(prev =>
          prev.map(c => (c.commentId === replyingTo ? { ...c, replies: [newC, ...(c.replies || [])] } : c))
        );
        setReplyContent('');
        setReplyingTo(null);
      } else {
        setComments(prev => [newC, ...prev]);
        setNewComment('');
      }

      toast({ title: 'Success', description: 'Comment posted successfully' });
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({ title: 'Error', description: 'Could not post comment', variant: 'destructive' });
    } finally {
      setIsPosting(false);
    }
  };

  const renderComment = (comment: Comment) => (
    <div key={comment.commentId} className="flex items-start gap-3">
      <Avatar className="w-10 h-10">
        <AvatarFallback>{comment.username[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <h5 className="font-medium text-sm">{comment.username}</h5>
          <span className="text-xs text-muted-foreground">
            {new Date(comment.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <p className="text-sm text-foreground">{comment.comment}</p>
        <div className="flex items-center gap-4">
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => handleReact(comment.commentId)}
            disabled={isReacting}
          >
            <Heart className={`w-4 h-4 ${comment.isReacted ? 'fill-red-500 text-red-500' : ''}`} />
            <span>{comment.reactionCount}</span>
          </button>
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => {
              setReplyingTo(comment.commentId);
              setReplyContent('');
            }}
          >
            Reply
          </button>
        </div>

        {replyingTo === comment.commentId && (
          <div className="mt-4 space-y-2">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write your reply..."
              className="w-full text-sm p-2 border rounded"
              rows={3}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handlePostComment} disabled={!replyContent.trim() || isPosting}>
                {isPosting ? 'Posting...' : 'Post Reply'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

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
    '/default-artifact.png';

  const artistName = artwork.artist_name || artwork.uploaded_by || 'Unknown artist';

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container flex items-center gap-4 h-16">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-semibold text-lg truncate">{artwork.title}</h1>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: media + description + comments */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <div className="aspect-[4/3] relative">
                <img
                  src={mainImage}
                  alt={artwork.images?.[selectedImageIndex]?.alttext || artwork.title}
                  className="w-full h-full object-cover"
                  onError={(e) => ((e.target as HTMLImageElement).src = '/placeholder-art.jpg')}
                />
              </div>
            </Card>

            {artwork.images && artwork.images.length > 1 && (
              <div className="mt-6 grid grid-cols-5 gap-4">
                {artwork.images.map((image, index) => (
                  <div
                    key={image.imageid || index}
                    className={`cursor-pointer group relative overflow-hidden rounded-lg border-2 transition-all duration-300 ${
                      selectedImageIndex === index ? 'border-primary shadow-lg' : 'border-transparent hover:border-muted-foreground/30'
                    }`}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={image.baseimageurl}
                        alt={image.alttext || `${artwork.title} view ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => ((e.target as HTMLImageElement).src = '/placeholder-art.jpg')}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Card className="mt-6">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Description</h3>
                <p className="text-muted-foreground">{artwork.description || 'No description available'}</p>
                {artwork.tags && artwork.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {artwork.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <MessageCircle className="h-5 w-5" />
                  <h3 className="font-semibold">Comments ({comments.length})</h3>
                </div>

                <div className="space-y-6">
                  {comments.map((comment) => (
                    <div key={comment.commentId}>
                      {renderComment(comment)}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="ml-6 mt-4 space-y-4">
                          {comment.replies.map((reply) => renderComment(reply))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <Separator className="my-6" />

                <div className="space-y-4">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your thoughts about this artwork..."
                    className="w-full text-sm p-2 border rounded min-h-[100px]"
                  />
                  <div className="flex justify-end">
                    <Button onClick={handlePostComment} disabled={!newComment.trim() || isPosting}>
                      {isPosting ? 'Posting...' : 'Post Comment'}
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
                    {(artwork.culture || artwork.period) && ' • '}
                    {artwork.culture} {artwork.culture && artwork.period && '•'} {artwork.period}
                  </p>
                </div>

                <Separator />

                {renderRatingSection()}

                <Separator />

                <div className="space-y-3">
                  {artwork.medium && (
                    <div>
                      <h4 className="font-medium text-sm">Medium</h4>
                      <p className="text-sm text-muted-foreground">{artwork.medium}</p>
                    </div>
                  )}
                  {artwork.dimension && (
                    <div>
                      <h4 className="font-medium text-sm">Dimensions</h4>
                      <p className="text-sm text-muted-foreground">{artwork.dimension}</p>
                    </div>
                  )}
                  {artwork.department && (
                    <div>
                      <h4 className="font-medium text-sm">Department</h4>
                      <p className="text-sm text-muted-foreground">{artwork.department}</p>
                    </div>
                  )}
                  {artwork.exact_found_date && (
                    <div>
                      <h4 className="font-medium text-sm">Date</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(artwork.exact_found_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {locationString && (
                    <div>
                      <h4 className="font-medium text-sm">Location</h4>
                      <p className="text-sm text-muted-foreground">{locationString}</p>
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
                  <Button variant="outline" size="sm">
                    <Heart className="h-4 w-4 mr-2" />
                    Like
                  </Button>
                  <Button variant="outline" size="sm">
                    <Bookmark className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={mainImage}
                      download={`${artwork.title.replace(/\s+/g, '_')}.jpg`}
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
