package com.digitaltwin.backend.util;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public class AuthUtil {

    public static String getUserIdFromToken(String authHeader) {
        // authHeader parameter is kept for backward compatibility with existing controllers,
        // but we actually use the Spring Security Context now.
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing or invalid authorization token");
        }
        // CustomUserDetails returns the ID as the username
        return auth.getName();
    }
}
