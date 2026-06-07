package com.digitaltwin.backend.controller;

import com.digitaltwin.backend.entity.PlaidToken;
import com.digitaltwin.backend.repository.PlaidTokenRepository;
import com.digitaltwin.backend.util.AuthUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/plaid")
public class PlaidController {

    private static final Logger log = LoggerFactory.getLogger(PlaidController.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final PlaidTokenRepository tokenRepo;
    private final AuthUtil authUtil;

    @Value("${plaid.client.id:}")
    private String clientId;

    @Value("${plaid.secret:}")
    private String secret;

    @Value("${plaid.env:sandbox}")
    private String plaidEnv;

    public PlaidController(PlaidTokenRepository tokenRepo, AuthUtil authUtil) {
        this.tokenRepo = tokenRepo;
        this.authUtil  = authUtil;
    }

    private String baseUrl() {
        return switch (plaidEnv) {
            case "production"   -> "https://production.plaid.com";
            case "development"  -> "https://development.plaid.com";
            default             -> "https://sandbox.plaid.com";
        };
    }

    // ── Config (public — no JWT) ─────────────────────────────────────────────

    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> config() {
        return ResponseEntity.ok(Map.of(
                "configured", !clientId.isBlank() && !secret.isBlank(),
                "env", plaidEnv
        ));
    }

    // ── Create Link Token ─────────────────────────────────────────────────────

    @PostMapping("/create-link-token")
    public ResponseEntity<Map<String, Object>> createLinkToken() {
        if (clientId.isBlank() || secret.isBlank()) {
            return ResponseEntity.ok(Map.of(
                    "configured", false,
                    "reason", "Set PLAID_CLIENT_ID and PLAID_SECRET environment variables."
            ));
        }

        String userId = authUtil.getUserId();

        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("client_id",   clientId);
            body.put("secret",      secret);
            body.put("client_name", "BeyondSelf");
            body.put("user",        Map.of("client_user_id", userId));
            body.put("products",    List.of("transactions"));
            body.put("country_codes", List.of("US"));
            body.put("language",    "en");

            JsonNode res = post("/link/token/create", body);
            String linkToken = res.path("link_token").asText();

            if (linkToken.isBlank()) {
                log.error("Plaid link token empty. Response: {}", res);
                return ResponseEntity.ok(Map.of("configured", false, "reason", "Plaid returned empty link_token."));
            }

            return ResponseEntity.ok(Map.of("configured", true, "linkToken", linkToken));

        } catch (Exception e) {
            log.error("create-link-token error: {}", e.getMessage());
            return ResponseEntity.ok(Map.of("configured", false, "reason", e.getMessage()));
        }
    }

    // ── Exchange Public Token ─────────────────────────────────────────────────

    @PostMapping("/exchange-token")
    public ResponseEntity<Map<String, Object>> exchangeToken(@RequestBody Map<String, String> req) {
        String userId      = authUtil.getUserId();
        String publicToken = req.get("publicToken");
        String institution = req.getOrDefault("institutionName", "Unknown Bank");

        if (publicToken == null || publicToken.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "publicToken is required"));
        }

        try {
            Map<String, Object> body = Map.of(
                    "client_id",    clientId,
                    "secret",       secret,
                    "public_token", publicToken
            );

            JsonNode res     = post("/item/public_token/exchange", body);
            String accessTok = res.path("access_token").asText();
            String itemId    = res.path("item_id").asText();

            tokenRepo.save(PlaidToken.builder()
                    .userId(userId)
                    .accessToken(accessTok)
                    .itemId(itemId)
                    .institutionName(institution)
                    .updatedAt(LocalDateTime.now())
                    .build());

            log.info("Plaid connected: user={} institution={}", userId, institution);
            return ResponseEntity.ok(Map.of("connected", true, "institution", institution));

        } catch (Exception e) {
            log.error("exchange-token error for user {}: {}", userId, e.getMessage());
            return ResponseEntity.ok(Map.of("connected", false, "reason", e.getMessage()));
        }
    }

    // ── Get Transactions (last 30 days) ───────────────────────────────────────

    @GetMapping("/transactions")
    public ResponseEntity<Map<String, Object>> transactions() {
        String userId = authUtil.getUserId();
        Optional<PlaidToken> tokenOpt = tokenRepo.findById(userId);

        if (tokenOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of("connected", false, "reason", "Not connected — link a bank first."));
        }

        String accessToken = tokenOpt.get().getAccessToken();
        String endDate     = LocalDate.now().toString();
        String startDate   = LocalDate.now().minusDays(30).toString();

        try {
            // Use transactions/sync (replaces deprecated transactions/get)
            Map<String, Object> syncBody = new LinkedHashMap<>();
            syncBody.put("client_id",    clientId);
            syncBody.put("secret",       secret);
            syncBody.put("access_token", accessToken);

            JsonNode syncRes = post("/transactions/sync", syncBody);
            JsonNode added   = syncRes.path("added");
            JsonNode accounts = syncRes.path("accounts");

            // Build a simplified transaction list from the "added" array
            List<Map<String, Object>> transactions = new ArrayList<>();
            if (added.isArray()) {
                for (JsonNode t : added) {
                    // Skip transactions outside the 30-day window
                    String txDate = t.path("date").asText("");
                    if (!txDate.isBlank() && txDate.compareTo(startDate) < 0) continue;

                    Map<String, Object> tx = new LinkedHashMap<>();
                    tx.put("id",          t.path("transaction_id").asText());
                    tx.put("date",        txDate);
                    tx.put("name",        t.path("name").asText());
                    tx.put("amount",      t.path("amount").asDouble());
                    // personal_finance_category is the new field; fall back to legacy category array
                    String cat = t.path("personal_finance_category").path("primary").asText("");
                    if (cat.isBlank() && t.path("category").isArray() && t.path("category").size() > 0)
                        cat = t.path("category").get(0).asText("Other");
                    tx.put("category",    cat.isBlank() ? "Other" : cat);
                    tx.put("merchantName", t.path("merchant_name").asText(""));
                    tx.put("pending",     t.path("pending").asBoolean(false));
                    transactions.add(tx);
                }
            }

            // Summarise accounts
            List<Map<String, Object>> accountList = new ArrayList<>();
            if (accounts.isArray()) {
                for (JsonNode a : accounts) {
                    accountList.add(Map.of(
                            "id",        a.path("account_id").asText(),
                            "name",      a.path("name").asText(),
                            "type",      a.path("type").asText(),
                            "subtype",   a.path("subtype").asText(),
                            "balance",   a.path("balances").path("current").asDouble(0)
                    ));
                }
            }

            return ResponseEntity.ok(Map.of(
                    "connected",        true,
                    "institution",      tokenOpt.get().getInstitutionName(),
                    "transactions",     transactions,
                    "accounts",         accountList,
                    "transactionCount", transactions.size(),
                    "startDate",        startDate,
                    "endDate",          endDate
            ));

        } catch (Exception e) {
            log.error("transactions error for user {}: {}", userId, e.getMessage());
            return ResponseEntity.ok(Map.of("connected", true, "syncError", e.getMessage()));
        }
    }

    // ── Status ────────────────────────────────────────────────────────────────

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        String userId = authUtil.getUserId();
        Optional<PlaidToken> tok = tokenRepo.findById(userId);
        if (tok.isPresent()) {
            return ResponseEntity.ok(Map.of(
                    "connected",   true,
                    "institution", tok.get().getInstitutionName() != null ? tok.get().getInstitutionName() : "Bank",
                    "linkedAt",    tok.get().getUpdatedAt() != null ? tok.get().getUpdatedAt().toString() : ""
            ));
        }
        return ResponseEntity.ok(Map.of("connected", false));
    }

    // ── Disconnect ────────────────────────────────────────────────────────────

    @PostMapping("/disconnect")
    public ResponseEntity<Map<String, Object>> disconnect() {
        String userId = authUtil.getUserId();
        tokenRepo.deleteById(userId);
        log.info("Plaid disconnected: user={}", userId);
        return ResponseEntity.ok(Map.of("disconnected", true));
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private JsonNode post(String path, Map<String, Object> body) throws Exception {
        String json = MAPPER.writeValueAsString(body);
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl() + path))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        HttpResponse<String> resp = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() >= 400) {
            throw new RuntimeException("Plaid API " + resp.statusCode() + ": " + resp.body());
        }
        return MAPPER.readTree(resp.body());
    }
}
