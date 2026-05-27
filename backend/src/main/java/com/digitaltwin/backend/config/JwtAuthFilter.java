package com.digitaltwin.backend.config;

import com.digitaltwin.backend.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

/**
 * JWT Authentication Filter — validates signed JWTs on every protected request.
 *
 * Protected: all /api/** routes EXCEPT the allow-list below.
 * On invalid/missing token → 401 Unauthorized.
 * On valid token → sets X-User-Id header downstream for controllers to use.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthFilter.class);

    // Public endpoints that do NOT require a JWT
    private static final Set<String> PUBLIC_PREFIXES = Set.of(
            "/api/auth/login",
            "/api/auth/signup",
            "/api/ai/status",
            "/h2-console"
    );

    private final JwtUtil jwtUtil;

    public JwtAuthFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        // Skip non-API paths and pre-flight OPTIONS requests
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) return true;
        if (!path.startsWith("/api/") && !path.startsWith("/h2-console")) return true;
        return PUBLIC_PREFIXES.stream().anyMatch(path::startsWith);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        // Reject missing or malformed header
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            sendUnauthorized(response, "Missing or malformed Authorization header");
            return;
        }

        String token = authHeader.substring(7);

        // Reject legacy insecure frontend tokens — they are NOT signed and must not be trusted
        if (token.startsWith("dt_jwt_")) {
            sendUnauthorized(response, "Demo tokens are not accepted by the backend API. Please use a real account.");
            return;
        }

        // Validate the signed JWT
        try {
            String userId = jwtUtil.getUserIdFromToken(token);
            if (userId == null || userId.isBlank()) {
                sendUnauthorized(response, "Invalid token: empty subject");
                return;
            }
            // Propagate userId to controllers via request attribute
            request.setAttribute("authenticatedUserId", userId);
            chain.doFilter(request, response);
        } catch (Exception e) {
            log.warn("JWT validation failed for path {}: {}", request.getServletPath(), e.getMessage());
            sendUnauthorized(response, "Invalid or expired JWT token");
        }
    }

    private void sendUnauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"" + message + "\",\"status\":401}");
    }
}
