package com.digitaltwin.backend.config;

import com.digitaltwin.backend.repository.UserRepository;
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

    private static final Set<String> PUBLIC_PREFIXES = Set.of(
            "/api/auth/login",
            "/api/auth/signup",
            "/api/ai/status",          // health-check only — no AI call
            "/api/fitbit/callback",
            "/api/fitbit/config",
            "/api/fitbit/connect",
            "/api/plaid/config",       // lets frontend check if Plaid is configured
            "/h2-console"
            // /api/ai/chat, /api/ai/narrative, /api/ai/explain are now AUTHENTICATED
            // /api/groq/chat is AUTHENTICATED (server-side Groq proxy)
    );

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    public JwtAuthFilter(JwtUtil jwtUtil, UserRepository userRepository) {
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        // Skip non-API paths and pre-flight OPTIONS requests
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) return true;
        if (path == null || (!path.startsWith("/api/") && !path.startsWith("/h2-console"))) return true;
        return PUBLIC_PREFIXES.stream().anyMatch(path::startsWith);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        // --- 1. Apply Security Headers (WOW factor) ---
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("Content-Security-Policy", "default-src 'self'");
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

        String authHeader = request.getHeader("Authorization");

        // Reject missing or malformed header
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.warn("[SECURITY AUDIT] Missing or malformed Authorization header from IP: {}", request.getRemoteAddr());
            sendError(response, 401, "Missing or malformed Authorization header", request.getRequestURI());
            return;
        }

        String token = authHeader.substring(7);

        // Reject legacy insecure frontend tokens — they are NOT signed and must not be trusted
        if (token.startsWith("dt_jwt_") || token.startsWith("DEMO_SESSION_")) {
            log.warn("[SECURITY AUDIT] Blocked legacy/demo token attempt from IP: {} for path: {}", request.getRemoteAddr(), request.getRequestURI());
            sendError(response, 401, "Demo tokens are not accepted by the backend API. Please use a real account.", request.getRequestURI());
            return;
        }

        // Validate the signed JWT
        try {
            String userId = jwtUtil.getUserIdFromToken(token);
            if (userId == null || userId.isBlank()) {
                log.warn("[SECURITY AUDIT] Empty token subject from IP: {}", request.getRemoteAddr());
                sendError(response, 401, "Invalid token: empty subject", request.getRequestURI());
                return;
            }
            // Check the userId actually exists in the current DB (guards against stale tokens after server restart)
            if (!userRepository.existsById(userId)) {
                log.warn("[SECURITY AUDIT] Stale JWT — userId {} not found in DB. IP: {}", userId, request.getRemoteAddr());
                sendError(response, 401, "STALE_SESSION", request.getRequestURI());
                return;
            }
            // Propagate userId to controllers via request attribute
            request.setAttribute("authenticatedUserId", userId);
            chain.doFilter(request, response);
        } catch (Exception e) {
            log.warn("[SECURITY AUDIT] JWT validation failed for path {}: {}", request.getRequestURI(), e.getMessage());
            sendError(response, 401, "Invalid or expired JWT token", request.getRequestURI());
        }
    }

    private void sendError(HttpServletResponse response, int status, String message, String path) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        String timestamp = java.time.Instant.now().toString();
        response.getWriter().write(String.format(
            "{\"timestamp\":\"%s\",\"status\":%d,\"error\":\"%s\",\"path\":\"%s\"}",
            timestamp, status, message, path
        ));
    }
}
