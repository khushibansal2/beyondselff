package com.digitaltwin.backend.util;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

/**
 * AuthUtil — reads the authenticated userId injected by JwtAuthFilter.
 *
 * JwtAuthFilter validates the signed JWT and sets "authenticatedUserId" as a
 * request attribute before the request reaches any controller. Controllers call
 * getUserId() to retrieve it; no token re-parsing happens here.
 */
@Component
public class AuthUtil {

    /**
     * Returns the authenticated userId from the current request context.
     * Throws 401 if the filter did not populate the attribute (should not
     * happen for protected endpoints, but guards against misconfiguration).
     */
    public String getUserId() {
        ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No request context");
        }
        HttpServletRequest request = attrs.getRequest();
        Object userId = request.getAttribute("authenticatedUserId");
        if (userId == null || userId.toString().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return userId.toString();
    }

    /**
     * Convenience overload that also accepts an Authorization header string.
     * Kept for backward compatibility with controllers that pass the header
     * explicitly; delegates to the attribute-based path.
     */
    public String getUserIdFromToken(String authHeader) {
        // The filter already validated the header — just read the attribute.
        return getUserId();
    }
}
