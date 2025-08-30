import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star,
  Bookmark,
  MessageCircle,
  Heart,
  Reply,
  Eye,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';
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
  deleteComment,
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
  canDelete?: boolean;
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
  averageRating?: number;
  userCount?: number;
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
  // State to track expanded replies for each comment
  const [expandedReplies, setExpandedReplies] = useState<Record<number, boolean>>({});

  const [localAverageRating, setLocalAverageRating] = useState(averageRating);
  const [localUserCount, setLocalUserCount] = useState(userCount);

  const [bookmarked, setBookmarked] = useState<boolean>(initialBookmarked);
  const [bookmarkBusy, setBookmarkBusy] = useState<boolean>(false);

  const artId = _id || id;
  const displayArtist = artist || culture || 'Unknown';

  const locationParts = [
    location?.city?.trim(),
    location?.country?.trim(),
    location?.continent?.trim(),
  ].filter(Boolean);
  const hasLocation = locationParts.length > 0;
  const locationString = locationParts.join(', ');

  // Bookmark logic
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!artId) return;
      if (initialBookmarked) {
        setBookmarked(true);
        return;
      }
      if (!currentUser?.userId) return;
      try {
        const flagged = await checkBookmark(artId);
        if (!cancelled) setBookmarked(flagged);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [initialBookmarked, artId, currentUser?.userId]);

  // Comments lazy-load
  useEffect(() => {
    if (commentOpen) fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentOpen, artId]);

  // Ratings snapshot
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
      const formatComment = (comment: any): Comment => ({
        commentId: comment.commentId,
        content: comment.comment,
        author: comment.userId === currentUser?.userId ? 'You' : comment.username,
        username: comment.username,
        avatar: (comment as any).avatar,
        timestamp: formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }),
        likesCount: comment.reactionCount || 0,
        isLiked: comment.isReacted || false,
        userId: comment.userId,
        replies: (comment.replies ?? []).map(formatComment),
        parentId: comment.parentId,
        canDelete: comment.userId === currentUser?.userId,
      });
      setComments(data.map(formatComment));
    } catch (error) {
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
    } catch {}
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

  // Function to calculate the total number of comments and nested replies
  const getTotalCommentCount = (comments: Comment[]): number => {
    let count = 0;
    const stack = [...comments];
    while (stack.length > 0) {
      const comment = stack.pop();
      if (comment) {
        count++;
        if (comment.replies && comment.replies.length > 0) {
          stack.push(...comment.replies);
        }
      }
    }
    return count;
  };
  const totalCommentCount = getTotalCommentCount(comments);

  // ----------- Comments logic -----------
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
      fetchComments();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to post comment',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Like/Unlike comment or reply (recursive)
  const handleLikeComment = async (commentId: number, _isLiked: boolean) => {
    if (!currentUser?.userId) {
      toast({ title: 'Error', description: 'You must be logged in to like comments.', variant: 'destructive' });
      return;
    }
    try {
      const data = await reactToComment({ commentId, userId: currentUser.userId });
      setComments((prev) => updateCommentInTree(prev, commentId, (c) => ({
        ...c,
        isLiked: data.isReacted,
        likesCount: data.reactionCount,
      })));
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update reaction status.',
        variant: 'destructive',
      });
    }
  };

  // Start reply input for a comment (recursive)
  const handleStartReply = (commentId: number) => {
    setComments((prev) => updateCommentInTree(prev, commentId, (c) => ({
      ...c,
      isReplying: true,
      replyContent: '',
    })));
  };

  // Cancel reply input for a comment (recursive)
  const handleCancelReply = (commentId: number) => {
    setComments((prev) => updateCommentInTree(prev, commentId, (c) => ({
      ...c,
      isReplying: false,
      replyContent: '',
    })));
  };

  // Change reply input for a comment (recursive)
  const handleReplyChange = (commentId: number, text: string) => {
    setComments((prev) => updateCommentInTree(prev, commentId, (c) => ({
      ...c,
      replyContent: text,
    })));
  };

  // Post reply to a comment (recursive, supports nested replies)
  const handlePostReply = async (commentId: number) => {
    const findComment = (list: Comment[]): Comment | undefined => {
      for (const c of list) {
        if (c.commentId === commentId) return c;
        if (c.replies.length) {
          const found = findComment(c.replies);
          if (found) return found;
        }
      }
      return undefined;
    };
    const parentComment = findComment(comments);
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
      const replyObj: Comment = {
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
        canDelete: true,
      };
      // FIX: Use a single setComments call to ensure a consistent state update
      setComments((prev) => {
        const updatedWithReply = addReplyToTree(prev, commentId, replyObj);
        return updateCommentInTree(updatedWithReply, commentId, (c) => ({
          ...c,
          isReplying: false,
          replyContent: '',
        }));
      });
      toast({ title: 'Success', description: 'Reply posted successfully' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to post reply',
        variant: 'destructive',
      });
    }
  };

  // Delete comment/reply (recursive)
  const handleDeleteComment = async (commentId: number) => {
    if (!currentUser?.userId) {
      toast({ title: 'Error', description: 'You must be logged in to delete comments', variant: 'destructive' });
      return;
    }
    try {
      const result = await deleteComment(commentId);
      if (result.success) {
        toast({ title: 'Success', description: 'Comment deleted successfully' });
        setComments((prev) => deleteCommentFromTree(prev, commentId));
      } else {
        toast({ title: 'Error', description: result.message || 'Failed to delete comment', variant: 'destructive' });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete comment',
        variant: 'destructive',
      });
    }
  };

  // ----------- Recursive helpers for nested comments/replies -----------
  function updateCommentInTree(list: Comment[], commentId: number, updateFn: (c: Comment) => Comment): Comment[] {
    return list.map((c) => {
      if (c.commentId === commentId) {
        return updateFn(c);
      }
      if (c.replies?.length) {
        return { ...c, replies: updateCommentInTree(c.replies, commentId, updateFn) };
      }
      return c;
    });
  }

  function addReplyToTree(list: Comment[], parentId: number, newReply: Comment): Comment[] {
    return list.map((c) => {
      if (c.commentId === parentId) {
        return { ...c, replies: [newReply, ...c.replies] };
      }
      if (c.replies?.length) {
        return { ...c, replies: addReplyToTree(c.replies, parentId, newReply) };
      }
      return c;
    });
  }

  function deleteCommentFromTree(list: Comment[], commentId: number): Comment[] {
    return list
      .filter((c) => c.commentId !== commentId)
      .map((c) => ({
        ...c,
        replies: c.replies ? deleteCommentFromTree(c.replies, commentId) : [],
      }));
  }

  // ----------- Recursive rendering for nested replies -----------
  const renderReplies = (replies: Comment[], parentId: number, depth = 0) => {
    const showAllReplies = expandedReplies[parentId];
    const displayedReplies = showAllReplies ? replies : replies.slice(0, 2);
  
    return (
      <div className={`mt-3 pl-6 border-l-2 border-gray-200`}>
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
                  <button
                    className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => handleStartReply(reply.commentId)}
                    aria-label="Reply to reply"
                  >
                    <Reply className="w-3 h-3" />
                    <span>Reply</span>
                  </button>
                  {reply.canDelete && (
                    <button
                      className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                      onClick={() => handleDeleteComment(reply.commentId)}
                      aria-label="Delete reply"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
                {/* Reply input for nested reply */}
                {reply.isReplying && (
                  <div className="mt-3 pl-6">
                    <div className="flex items-start space-x-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback>{currentUser?.username?.[0]?.toUpperCase() || 'Y'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <textarea
                          className="w-full text-xs p-2 border rounded"
                          placeholder="Write your reply..."
                          value={reply.replyContent || ''}
                          onChange={(e) => handleReplyChange(reply.commentId, e.target.value)}
                        />
                        <div className="flex justify-end space-x-2 mt-2">
                          <Button variant="ghost" size="sm" onClick={() => handleCancelReply(reply.commentId)}>
                            Cancel
                          </Button>
                          <Button variant="default" size="sm" onClick={() => handlePostReply(reply.commentId)}>
                            Reply
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* Nested replies */}
                {reply.replies && reply.replies.length > 0 && renderReplies(reply.replies, reply.commentId, depth + 1)}
              </div>
            </div>
          </div>
        ))}
        {replies.length > 2 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground text-xs mt-2"
            onClick={() => toggleReplies(parentId)}
          >
            {showAllReplies ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Show fewer replies
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Show all {replies.length} replies
              </>
            )}
          </Button>
        )}
      </div>
    );
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
                  <p className="text-xs text-muted-foreground">{totalCommentCount} comments</p>
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
                                {comment.canDelete && (
                                  <button
                                    className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                                    onClick={() => handleDeleteComment(comment.commentId)}
                                    aria-label="Delete comment"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Delete</span>
                                  </button>
                                )}
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

                              {/* Replies list (recursive) */}
                              {replyCount > 0 && renderReplies(comment.replies, comment.commentId)}
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