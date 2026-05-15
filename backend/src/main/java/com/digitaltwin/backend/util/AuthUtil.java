package com.digitaltwin.backend.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Base64;

public class AuthUtil {
    private static final ObjectMapper mapper = new ObjectMapper();

    public static String getUserIdFromToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer dt_jwt_")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing or invalid authorization token");
        }
        try {
            String base64Payload = authHeader.substring("Bearer dt_jwt_".length());
            String jsonPayload = new String(Base64.getDecoder().decode(base64Payload));
            JsonNode payload = mapper.readTree(jsonPayload);
            
            long exp = payload.get("exp").asLong();
            if (System.currentTimeMillis() > exp) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token expired");
            }
            
            return payload.get("id").asText();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token format");
        }
    }
}
