package com.example.demo.controller;

import com.example.demo.dto.CommentRequest;
import com.example.demo.dto.ReactionRequest;
import com.example.demo.entity.Artifact;
import com.example.demo.entity.Comment;
import com.example.demo.entity.User;
import com.example.demo.entity.UserArtifact;
import com.example.demo.repository.CommentRepository;
import com.example.demo.repository.UserArtifactRepository;
import com.example.demo.repository.ArtifactRepository;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
@RestController
@RequestMapping("/api/comments")
public class CommentController {
    
    private static final Logger logger = LoggerFactory.getLogger(CommentController.class);

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private UserArtifactRepository userArtifactRepository;
    
    @Autowired
    private ArtifactRepository artifactRepository;


    @GetMapping("/artifact/{artifactId}")
    public ResponseEntity<?> getCommentsByArtifact(
            @PathVariable String artifactId,
            HttpSession session) {
        try {
            User user = (User) session.getAttribute("loggedInUser");

            List<Comment> topLevelComments = commentRepository.findByUserArtifact_ArtifactIdOrderByCreatedAtDesc(artifactId);

            List<Map<String, Object>> commentsWithReplies = topLevelComments.stream()
                    .map(comment -> createCommentMapRecursive(comment, user)) // 👈 recursive
                    .collect(Collectors.toList());

            return ResponseEntity.ok(commentsWithReplies);
        } catch (Exception e) {
            logger.error("Failed to fetch comments", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch comments"));
        }
    }

    private Map<String, Object> createCommentMapRecursive(Comment comment, User currentUser) {
        Map<String, Object> map = createCommentMap(comment, currentUser);

        List<Comment> replies = commentRepository.findRepliesByParentId(comment.getCommentId());
        List<Map<String, Object>> replyDTOs = replies.stream()
                .map(reply -> createCommentMapRecursive(reply, currentUser)) // 👈 recursion
                .collect(Collectors.toList());

        map.put("replies", replyDTOs);
        return map;
    }


    private Map<String, Object> createCommentMap(Comment comment, User currentUser) {
        Map<String, Object> commentMap = new HashMap<>();
        commentMap.put("commentId", comment.getCommentId());
        commentMap.put("comment", comment.getComment());
        commentMap.put("userId", comment.getUserId());
        commentMap.put("createdAt", comment.getCreatedAt());
        commentMap.put("username", comment.getUser().getUsername());
        commentMap.put("reactionCount", comment.getReactionCount());
        
        if (currentUser != null) {
            commentMap.put("isReacted", comment.getReactedUserIds().contains(currentUser.getUserId()));
        } else {
            commentMap.put("isReacted", false);
        }
        
        if (comment.getParent() != null) {
            commentMap.put("parentId", comment.getParent().getCommentId());
        }
        
        return commentMap;
    }

    @PostMapping
    public ResponseEntity<?> createComment(
            @Valid @RequestBody CommentRequest commentRequest,
            HttpSession session) {
        
        try {
            // 1. Validate session and user
            User user = (User) session.getAttribute("loggedInUser");
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }

            // 2. Validate input
            if (commentRequest.getArtifactId() == null || commentRequest.getArtifactId().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Artifact ID is required"));
            }

            // 3. Find or create UserArtifact relationship
         // try exact pair
            Optional<UserArtifact> existing =
                userArtifactRepository.findByArtifactIdAndUserId(commentRequest.getArtifactId(), user.getUserId());

            UserArtifact userArtifact = existing.orElseGet(() -> {
                // double-check in case of concurrent creation
                if (!userArtifactRepository.existsByArtifactIdAndUserId(commentRequest.getArtifactId(), user.getUserId())) {
                    UserArtifact ua = new UserArtifact();
                    ua.setArtifactId(commentRequest.getArtifactId());
                    ua.setUserId(user.getUserId());
                    return userArtifactRepository.save(ua);
                }
                // someone else just created it; fetch again
                return userArtifactRepository.findByArtifactIdAndUserId(commentRequest.getArtifactId(), user.getUserId())
                        .orElseThrow(); // shouldn't happen
            });


            // 4. Create and save comment
            Comment comment = new Comment();
            comment.setComment(commentRequest.getContent());
            comment.setUserArtifact(userArtifact);
            comment.setUser(user);

            comment.setUserId(user.getUserId());
            comment.setCreatedAt(LocalDateTime.now());
            
            // Handle parent comment if this is a reply
            if (commentRequest.getParentId() != null) {
                Optional<Comment> parentComment = commentRepository.findById(commentRequest.getParentId());
                if (parentComment.isPresent()) {
                    comment.setParent(parentComment.get());
                } else {
                    return ResponseEntity.badRequest()
                            .body(Map.of("error", "Parent comment not found"));
                }
            }
            
            Comment savedComment = commentRepository.save(comment);

            // 5. Prepare response
            Map<String, Object> response = createCommentMap(savedComment, user);
            response.put("success", true);
            return ResponseEntity.ok(response);

        } catch (DataIntegrityViolationException e) {
            logger.error("Database error creating comment", e);
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Database constraint violation"));
        } catch (Exception e) {
            logger.error("Failed to create comment", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create comment"));
        }
    }

    @PostMapping("/react")
    public ResponseEntity<?> toggleReaction(
            @Valid @RequestBody ReactionRequest reactionRequest,
            HttpSession session) {
        
        try {
            // Validate session and user
            User user = (User) session.getAttribute("loggedInUser");
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }

            // Validate input
            if (reactionRequest.getCommentId() == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Comment ID is required"));
            }

            Optional<Comment> commentOpt = commentRepository.findById(reactionRequest.getCommentId());
            if (commentOpt.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Comment not found"));
            }

            Comment comment = commentOpt.get();
            Set<Integer> reactedUserIds = comment.getReactedUserIds();
            boolean isReacted = reactedUserIds.contains(user.getUserId());

            if (isReacted) {
                // Remove reaction
                reactedUserIds.remove(user.getUserId());
                comment.setReactionCount(comment.getReactionCount() - 1);
            } else {
                // Add reaction
                reactedUserIds.add(user.getUserId());
                comment.setReactionCount(comment.getReactionCount() + 1);
            }

            commentRepository.save(comment);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("reactionCount", comment.getReactionCount());
            response.put("isReacted", !isReacted);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Failed to toggle reaction", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to toggle reaction"));
        }
    }
    
    @GetMapping("/curator/recent")
    public ResponseEntity<?> getRecentCommentsForCurator(HttpSession session) {
        try {
            User user = (User) session.getAttribute("loggedInUser");
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }

            // 1. Get curator's artifacts from MongoDB (same pattern as CuratorDashboardController)
            List<Artifact> curatorArtifacts = artifactRepository.findByUploaded_by(user.getUsername());
            
            if (curatorArtifacts.isEmpty()) {
                return ResponseEntity.ok(Collections.emptyList());
            }

            // 2. Get artifact IDs
            List<String> artifactIds = curatorArtifacts.stream()
                    .map(Artifact::getId)
                    .collect(Collectors.toList());

            // 3. Get UserArtifact records for these artifacts
            List<UserArtifact> userArtifacts = userArtifactRepository.findByArtifactIdIn(artifactIds);
            
            // 4. Get UserArtifact IDs to fetch comments
            List<Integer> userArtifactIds = userArtifacts.stream()
                    .map(UserArtifact::getUserArtifactId)
                    .collect(Collectors.toList());

            if (userArtifactIds.isEmpty()) {
                return ResponseEntity.ok(Collections.emptyList());
            }

            // 5. Get recent comments for these UserArtifact records
            List<Comment> recentComments = commentRepository.findByUserArtifact_UserArtifactIdInOrderByCreatedAtDesc(
                userArtifactIds, PageRequest.of(0, 5));
            
            // 6. Create mapping for artifact titles
            Map<String, String> artifactTitleMap = curatorArtifacts.stream()
                    .collect(Collectors.toMap(Artifact::getId, Artifact::getTitle));
            
            // 7. Create mapping for UserArtifact to Artifact ID
            Map<Integer, String> userArtifactToArtifactIdMap = userArtifacts.stream()
                    .collect(Collectors.toMap(UserArtifact::getUserArtifactId, UserArtifact::getArtifactId));

            // 8. Build response
            List<Map<String, Object>> response = recentComments.stream()
                .map(comment -> {
                    Map<String, Object> commentMap = new HashMap<>();
                    commentMap.put("commentId", comment.getCommentId());
                    commentMap.put("comment", comment.getComment());
                    
                    // Get artifact ID from UserArtifact mapping
                    String artifactId = userArtifactToArtifactIdMap.get(comment.getUserArtifact().getUserArtifactId());
                    commentMap.put("artifactId", artifactId);
                    
                    // Get title from artifact mapping
                    String artifactTitle = artifactTitleMap.getOrDefault(artifactId, "Artwork");
                    commentMap.put("artifactTitle", artifactTitle);
                    
                    commentMap.put("username", comment.getUser().getUsername());
                    commentMap.put("createdAt", comment.getCreatedAt());
                    commentMap.put("isCuratorArtwork", true);
                    
                    return commentMap;
                })
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Failed to fetch recent comments for curator", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch recent comments"));
        }
    }
    
    @DeleteMapping("/{commentId}")
    public ResponseEntity<?> deleteComment(
            @PathVariable Integer commentId,
            HttpSession session) {
        
        try {
            // Validate session and user
            User user = (User) session.getAttribute("loggedInUser");
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }

            // Find the comment
            Optional<Comment> commentOpt = commentRepository.findById(commentId);
            if (commentOpt.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Comment not found"));
            }

            Comment comment = commentOpt.get();

            // Check if user owns the comment
            if (!comment.getUserId().equals(user.getUserId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You can only delete your own comments"));
            }

            // Check if comment has replies - if so, soft delete by clearing content
            List<Comment> replies = commentRepository.findRepliesByParentId(commentId);
            if (!replies.isEmpty()) {
                // Soft delete: mark as deleted but keep the structure
                comment.setComment("[deleted]");
                comment.setUser(null); // Remove user reference for deleted comments
                commentRepository.save(comment);
            } else {
                // Hard delete if no replies
                commentRepository.delete(comment);
            }

            return ResponseEntity.ok(Map.of("success", true, "message", "Comment deleted successfully"));

        } catch (Exception e) {
            logger.error("Failed to delete comment", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to delete comment"));
        }
    }
}