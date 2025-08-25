import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Bookmark, MessageCircle, Heart, Reply, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';

// ✅ axios-based helpers
import {
  checkBookmark,
  createBookmark,
  deleteBookmark,
  getArtifactRatingInfo,
  getCommentsByArtifact,
  postComment,
  reactToComment,
  type RatingDTO,
} from '@/services/api';

type ImageLike = { baseimageurl?: string };

interface Comment {
  commentId: number;
  content: string;
  author: string;
  username: string;
  avatar?: string;
  timestamp: string;
  likesCount: number;
  isLiked: boolean;
  userId: number;
  replies: Comment[];
  isReplying?: boolean;
  replyContent?: string;
  parentId?: number;
}

interface ArtCardProps {
  id: string;
  _id?: string;
  title: string;
  artist?: string;
  culture?: string;
  period?: string;
  category?: string;
  description?: string;
  medium?: string;
  image: string;
  images?: ImageLike[];
  location?: { city?: string; country?: string; continent?: string };

  // (optional / legacy)
  rating?: number;
  totalRatings?: number;
  onRate?: (artId: string, rating: number) => void;

  averageRating?: number;  // used for star display
  userCount?: number;      // used for star display

  initialBookmarked?: boolean;
  onBookmarkChange?: (bookmarked: boolean) => void;
}

export const ArtCard = (props: ArtCardProps) => {
  const {
    _id, id, title, artist, culture, period, category, description, medium, image,
    images = [], location, averageRating = 0, userCount = 0,
    initialBookmarked = false,
    onBookmarkChange,
  } = props;

  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser } = useCurrentUser();

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCommentLoading, setIsCommentLoading] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Record<number, boolean>>({});

  const [localAverageRating, setLocalAverageRating] = useState(averageRating);
  const [localUserCount, setLocalUserCount] = useState(userCount);

  const [bookmarked, setBookmarked] = useState<boolean>(initialBookmarked);
  const [bookmarkBusy, setBookmarkBusy] = useState<boolean>(false);

  const artId = _id || id;
  const displayArtist = artist || culture || 'Unknown';

  // Compact location text
  const locationParts = [
    location?.city?.trim(),
    location?.country?.trim(),
    location?.continent?.trim(),
  ].filter(Boolean);
  const hasLocation = locationParts.length > 0;
  const locationString = locationParts.join(', ');

  /* --------------------------- Initialize bookmark flag --------------------------- */
useEffect(() => {
  let cancelled = false;

  (async () => {
    if (!artId) return;

    if (initialBookmarked) {
      setBookmarked(true);
      return;
    }

    // ✅ only run bookmark check if logged in
    if (!currentUser?.userId) {
      return;
    }

    try {
      const flagged = await checkBookmark(artId);
      if (!cancelled) setBookmarked(flagged);
    } catch {
      // Optionally log or toast for debugging
    }
  })();

  return () => {
    cancelled = true;
  };
}, [initialBookmarked, artId, currentUser?.userId]);


  /* ---------------------------- Lazy-load comments UI ---------------------------- */
  useEffect(() => {
    if (commentOpen) fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentOpen, artId]);

  /* ------------------------------- Ratings snapshot ------------------------------ */
  useEffect(() => {
    fetchRatings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artId]);

  const handleBookmarkToggle = async () => {
    if (!artId) return;

    if (!currentUser?.userId) {
      toast({ title: 'Login required', description: 'Please sign in to save items.', variant: 'destructive' });
      return;
    }

    const prev = bookmarked;
    setBookmarked(!prev);
    setBookmarkBusy(true);

    try {
      if (!prev) {
        await createBookmark(artId);
        setBookmarked(true);
        onBookmarkChange?.(true);
        toast({ title: 'Saved', description: 'Added to your saved items.' });
      } else {
        await deleteBookmark(artId);
        setBookmarked(false);
        onBookmarkChange?.(false);
        toast({ title: 'Removed', description: 'Removed from your saved items.' });
      }
    } catch (e) {
      setBookmarked(prev);
      onBookmarkChange?.(prev);
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Bookmark action failed.',
        variant: 'destructive',
      });
    } finally {
      setBookmarkBusy(false);
    }
  };

  const fetchComments = async () => {
    if (!artId) return;
    setIsCommentLoading(true);
    try {
      const data = await getCommentsByArtifact(artId);
      const formatted = data.map((comment) => ({
        commentId: comment.commentId,
        content: comment.comment,
        author: comment.userId === currentUser?.userId ? 'You' : comment.username,
        username: comment.username,
        avatar: (comment as any).avatar,
        timestamp: formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }),
        likesCount: comment.reactionCount || 0,
        isLiked: comment.isReacted || false,
        userId: comment.userId,
        replies:
          (comment.replies ?? []).map((reply) => ({
            commentId: reply.commentId,
            content: reply.comment,
            author: reply.userId === currentUser?.userId ? 'You' : reply.username,
            username: reply.username,
            avatar: (reply as any).avatar,
            timestamp: formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true }),
            likesCount: reply.reactionCount || 0,
            isLiked: reply.isReacted || false,
            userId: reply.userId,
            replies: [],
            parentId: reply.parentId,
          })) || [],
      }));
      setComments(formatted);
    } catch (error) {
      console.error('Failed to load comments:', error);
      toast({ title: 'Error', description: 'Failed to load comments', variant: 'destructive' });
    } finally {
      setIsCommentLoading(false);
    }
  };

  const fetchRatings = async () => {
    if (!artId) return;
    try {
      const data: RatingDTO = await getArtifactRatingInfo(artId);
      setLocalAverageRating(data.averageRating ?? 0);
      setLocalUserCount(data.totalRatings ?? 0);
    } catch (error) {
      console.error('Failed to fetch rating info:', error);
    }
  };

  const toggleReplies = (commentId: number) => {
    setExpandedReplies((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const handleViewDetails = () => {
    if (!artId) {
      toast({ title: 'Error', description: 'Invalid artwork ID.', variant: 'destructive' });
      return;
    }
    navigate(`/artwork/${artId}`);
  };

  /* --------------------------------- Comments --------------------------------- */

  const handlePostComment = async () => {
    if (!currentUser?.userId) {
      toast({ title: 'Error', description: 'You must be logged in to comment', variant: 'destructive' });
      return;
    }
    const trimmedComment = newComment.trim();
    if (!trimmedComment) {
      toast({ title: 'Error', description: 'Comment cannot be empty', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      await postComment({ artifactId: artId, content: trimmedComment });
      setNewComment('');
      toast({ title: 'Success', description: 'Comment posted successfully' });
      fetchComments(); // refresh list
    } catch (error) {
      console.error('Comment submission error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to post comment',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikeComment = async (commentId: number, _isLiked: boolean) => {
    if (!currentUser?.userId) {
      toast({ title: 'Error', description: 'You must be logged in to like comments.', variant: 'destructive' });
      return;
    }

    try {
      const data = await reactToComment({ commentId, userId: currentUser.userId });
      setComments((prev) =>
        prev.map((c) => {
          if (c.commentId === commentId) {
            return { ...c, isLiked: data.isReacted, likesCount: data.reactionCount };
          }
          const replies = c.replies.map((r) =>
            r.commentId === commentId ? { ...r, isLiked: data.isReacted, likesCount: data.reactionCount } : r
          );
          return { ...c, replies };
        })
      );
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update reaction status.',
        variant: 'destructive',
      });
    }
  };

  const handleStartReply = (commentId: number) => {
    setComments((prev) =>
      prev.map((c) => (c.commentId === commentId ? { ...c, isReplying: true, replyContent: '' } : c))
    );
  };

  const handleCancelReply = (commentId: number) => {
    setComments((prev) =>
      prev.map((c) => (c.commentId === commentId ? { ...c, isReplying: false, replyContent: '' } : c))
    );
  };

  const handleReplyChange = (commentId: number, text: string) => {
    setComments((prev) => prev.map((c) => (c.commentId === commentId ? { ...c, replyContent: text } : c)));
  };

  const handlePostReply = async (commentId: number) => {
    const parentComment = comments.find((c) => c.commentId === commentId);
    if (!parentComment || !parentComment.replyContent?.trim()) {
      toast({ title: 'Error', description: 'Reply cannot be empty', variant: 'destructive' });
      return;
    }

    try {
      const newReply = await postComment({
        artifactId: artId,
        content: parentComment.replyContent,
        parentId: commentId,
      });

      // Optimistic UI: prepend reply to that comment
      setComments((prev) =>
        prev.map((c) =>
          c.commentId === commentId
            ? {
                ...c,
                replies: [
                  {
                    commentId: newReply.commentId,
                    content: newReply.comment,
                    author: 'You',
                    username: currentUser!.username,
                    timestamp: 'Just now',
                    likesCount: 0,
                    isLiked: false,
                    userId: currentUser!.userId,
                    replies: [],
                    parentId: commentId,
                  },
                  ...c.replies,
                ],
                isReplying: false,
                replyContent: '',
              }
            : c
        )
      );

      toast({ title: 'Success', description: 'Reply posted successfully' });
    } catch (error) {
      console.error('Failed to post reply:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to post reply',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-elegant hover:-translate-y-1 bg-card">
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={image || '/placeholder-art.jpg'}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-art.jpg';
          }}
        />

        {/* Save (corner) */}
        <button
          onClick={handleBookmarkToggle}
          disabled={bookmarkBusy}
          className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-lg transition-all duration-200 shadow-sm"
          aria-label={bookmarked ? 'Remove from saved' : 'Save for later'}
        >
          <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
        </button>
      </div>

      <CardContent className="p-4 space-y-3">
        <h3 className="font-semibold text-lg text-foreground line-clamp-2">{title}</h3>

        <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span>by {displayArtist}</span>
          {period && <span>• {period}</span>}
          {category && <span>• {category}</span>}
        </div>

        {description && <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>}

        {medium && <p className="text-xs text-muted-foreground italic">Medium: {medium}</p>}

        {hasLocation && <p className="text-xs text-muted-foreground">From: {locationString}</p>}

        <div className="flex items-center justify-between pt-2">
          {/* Ratings */}
          <div className="flex items-center space-x-1">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.floor(localAverageRating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground/40'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground ml-1">
              ({localAverageRating.toFixed(1)} avg, {localUserCount} {localUserCount === 1 ? 'rating' : 'ratings'})
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleViewDetails} className="h-8 px-3 text-xs">
              <Eye className="w-3 h-3 mr-1" />
              View
            </Button>

            {/* Comments popover */}
            <Popover open={commentOpen} onOpenChange={setCommentOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-accent" aria-label="View comments">
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-0" align="end">
                <div className="p-4 border-b">
                  <h4 className="font-semibold text-sm">Comments</h4>
                  <p className="text-xs text-muted-foreground">{comments.length} comments</p>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {isCommentLoading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">Loading comments...</div>
                  ) : comments.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No comments yet. Be the first to comment!
                    </div>
                  ) : (
                    comments.map((comment) => {
                      const replyCount = comment.replies.length;
                      const showAllReplies = expandedReplies[comment.commentId];
                      const displayedReplies = showAllReplies ? comment.replies : comment.replies.slice(0, 2);

                      return (
                        <div key={comment.commentId} className="p-4 border-b last:border-b-0">
                          <div className="flex items-start space-x-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={comment.avatar} />
                              <AvatarFallback>{comment.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center space-x-2">
                                <h5 className="text-sm font-medium">{comment.author}</h5>
                                <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
                              </div>
                              <p className="text-sm text-foreground">{comment.content}</p>
                              <div className="flex items-center space-x-4 pt-2">
                                <button
                                  className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                  onClick={() => handleLikeComment(comment.commentId, comment.isLiked)}
                                  aria-label={comment.isLiked ? 'Unlike comment' : 'Like comment'}
                                >
                                  <Heart className={`w-3 h-3 ${comment.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                                  <span>{comment.likesCount}</span>
                                </button>
                                <button
                                  className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                  onClick={() => handleStartReply(comment.commentId)}
                                  aria-label="Reply to comment"
                                >
                                  <Reply className="w-3 h-3" />
                                  <span>Reply</span>
                                </button>
                              </div>

                              {/* Reply input */}
                              {comment.isReplying && (
                                <div className="mt-3 pl-6">
                                  <div className="flex items-start space-x-2">
                                    <Avatar className="w-6 h-6">
                                      <AvatarFallback>{currentUser?.username?.[0]?.toUpperCase() || 'Y'}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <textarea
                                        className="w-full text-xs p-2 border rounded"
                                        placeholder="Write your reply..."
                                        value={comment.replyContent || ''}
                                        onChange={(e) => handleReplyChange(comment.commentId, e.target.value)}
                                      />
                                      <div className="flex justify-end space-x-2 mt-2">
                                        <Button variant="ghost" size="sm" onClick={() => handleCancelReply(comment.commentId)}>
                                          Cancel
                                        </Button>
                                        <Button variant="default" size="sm" onClick={() => handlePostReply(comment.commentId)}>
                                          Reply
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Replies list */}
                              {replyCount > 0 && (
                                <div className="mt-3 pl-6 border-l-2 border-gray-200">
                                  {displayedReplies.map((reply) => (
                                    <div key={reply.commentId} className="mb-3">
                                      <div className="flex items-start space-x-3">
                                        <Avatar className="w-6 h-6">
                                          <AvatarImage src={reply.avatar} />
                                          <AvatarFallback>{reply.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                          <div className="flex items-center space-x-2">
                                            <span className="text-xs font-medium">{reply.author}</span>
                                            <span className="text-xs text-muted-foreground">{reply.timestamp}</span>
                                          </div>
                                          <p className="text-xs mt-1">{reply.content}</p>
                                          <div className="flex items-center space-x-4 pt-2">
                                            <button
                                              className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                              onClick={() => handleLikeComment(reply.commentId, reply.isLiked)}
                                              aria-label={reply.isLiked ? 'Unlike reply' : 'Like reply'}
                                            >
                                              <Heart className={`w-3 h-3 ${reply.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                                              <span>{reply.likesCount}</span>
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}

                                  {replyCount > 2 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-muted-foreground hover:text-foreground text-xs mt-2"
                                      onClick={() => toggleReplies(comment.commentId)}
                                    >
                                      {showAllReplies ? (
                                        <>
                                          <ChevronUp className="h-3 w-3 mr-1" />
                                          Show fewer replies
                                        </>
                                      ) : (
                                        <>
                                          <ChevronDown className="h-3 w-3 mr-1" />
                                          Show all {replyCount} replies
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-4 border-t bg-muted/30">
                  {currentUser?.userId ? (
                    <div className="flex items-center space-x-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback>{currentUser.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground"
                        aria-label="Add a comment"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                      />
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={handlePostComment} disabled={isLoading}>
                        {isLoading ? 'Posting...' : 'Post'}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center text-sm text-muted-foreground py-2">Please log in to comment</div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant={bookmarked ? 'default' : 'outline'}
              size="sm"
              onClick={handleBookmarkToggle}
              disabled={bookmarkBusy}
              className="h-8 px-3 text-xs"
              aria-label={bookmarked ? 'Remove from saved' : 'Save for later'}
            >
              {bookmarked ? 'Saved' : 'Save'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
