package com.example.demo.controller;

import com.example.demo.dto.BookmarkDTO;
import com.example.demo.entity.Bookmark;
import com.example.demo.entity.User;
import com.example.demo.entity.UserArtifact;
import com.example.demo.repository.BookmarkRepository;
import com.example.demo.repository.UserArtifactRepository;
import com.example.demo.repository.UserRepository;
import jakarta.servlet.http.HttpSession;
import jakarta.transaction.Transactional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/bookmarks")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class BookmarkController {

    @Autowired
    private BookmarkRepository bookmarkRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private UserArtifactRepository userArtifactRepository;

    @GetMapping
    public ResponseEntity<List<BookmarkDTO>> getUserBookmarks(HttpSession session) {
        User user = (User) session.getAttribute("loggedInUser");
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        
        List<Bookmark> bookmarks = bookmarkRepository.findByUserUserId(user.getUserId());
        List<BookmarkDTO> bookmarkDTOs = bookmarks.stream().map(bookmark -> {
            BookmarkDTO dto = new BookmarkDTO();
            dto.setBookmarkId(bookmark.getBookmarkId());
            dto.setArtifactId(bookmark.getUserArtifact().getArtifactId());
            dto.setUserId(bookmark.getUser().getUserId());
            dto.setCreatedAt(bookmark.getCreatedAt());
            return dto;
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(bookmarkDTOs);
    }

    @PostMapping
    public ResponseEntity<BookmarkDTO> addBookmark(@RequestParam String artifactId, HttpSession session) {
        User user = (User) session.getAttribute("loggedInUser");
        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        // Already bookmarked?
        if (bookmarkRepository.existsByUserUserIdAndUserArtifactArtifactId(user.getUserId(), artifactId)) {
            return ResponseEntity.badRequest().build();
        }

        // Get any existing UserArtifact (from any user)
        Optional<UserArtifact> existingUA = userArtifactRepository.findFirstByArtifactId(artifactId);
        if (existingUA.isEmpty()) {
            return ResponseEntity.status(404).body(null);
        }

        Bookmark bookmark = new Bookmark();
        bookmark.setUser(user);
        bookmark.setUserArtifact(existingUA.get());  // use existing, not create new
        bookmark.setCreatedAt(LocalDateTime.now());

        Bookmark savedBookmark = bookmarkRepository.save(bookmark);

        BookmarkDTO dto = new BookmarkDTO();
        dto.setBookmarkId(savedBookmark.getBookmarkId());
        dto.setArtifactId(savedBookmark.getUserArtifact().getArtifactId());
        dto.setUserId(savedBookmark.getUser().getUserId());
        dto.setCreatedAt(savedBookmark.getCreatedAt());

        return ResponseEntity.ok(dto);
    }

    
    @Transactional
    @DeleteMapping
    public ResponseEntity<Void> removeBookmark(@RequestParam String artifactId, HttpSession session) {
        User user = (User) session.getAttribute("loggedInUser");
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        
        bookmarkRepository.deleteByUserAndArtifact(user.getUserId(), artifactId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/check")
    public ResponseEntity<Boolean> checkBookmark(@RequestParam String artifactId, HttpSession session) {
        User user = (User) session.getAttribute("loggedInUser");
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        
        boolean isBookmarked = bookmarkRepository.existsByUserUserIdAndUserArtifactArtifactId(user.getUserId(), artifactId);
        return ResponseEntity.ok(isBookmarked);
    }
}