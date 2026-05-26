package com.digitaltwin.backend.controller;

import com.digitaltwin.backend.entity.TransactionRecord;
import com.digitaltwin.backend.repository.TransactionRepository;
import com.digitaltwin.backend.util.AuthUtil;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionRepository repo;
    private final AuthUtil authUtil;

    public TransactionController(TransactionRepository repo, AuthUtil authUtil) {
        this.repo = repo;
        this.authUtil = authUtil;
    }

    @PostMapping
    public TransactionRecord save(@RequestHeader("Authorization") String auth,
                                   @RequestBody Map<String, Object> body) {
        String userId = authUtil.getUserIdFromToken(auth);

        TransactionRecord tx = TransactionRecord.builder()
                .userId(userId)
                .amount(((Number) body.getOrDefault("amount", 0)).doubleValue())
                .merchant((String) body.getOrDefault("merchant", "Unknown"))
                .category((String) body.getOrDefault("category", "Others"))
                .bank((String) body.getOrDefault("bank", "Unknown"))
                .transactionType((String) body.getOrDefault("type", "Debit"))
                .paymentMode((String) body.getOrDefault("paymentMode", "UPI"))
                .rawMessage((String) body.getOrDefault("rawMessage", ""))
                .source((String) body.getOrDefault("source", "manual"))
                .parsedAt(LocalDateTime.now())
                .build();

        return repo.save(tx);
    }

    @PostMapping("/batch")
    public List<TransactionRecord> saveBatch(@RequestHeader("Authorization") String auth,
                                              @RequestBody List<Map<String, Object>> batch) {
        String userId = authUtil.getUserIdFromToken(auth);
        List<TransactionRecord> records = batch.stream().map(body -> TransactionRecord.builder()
                .userId(userId)
                .amount(((Number) body.getOrDefault("amount", 0)).doubleValue())
                .merchant((String) body.getOrDefault("merchant", "Unknown"))
                .category((String) body.getOrDefault("category", "Others"))
                .bank((String) body.getOrDefault("bank", "Unknown"))
                .transactionType((String) body.getOrDefault("type", "Debit"))
                .paymentMode((String) body.getOrDefault("paymentMode", "UPI"))
                .rawMessage((String) body.getOrDefault("rawMessage", ""))
                .source((String) body.getOrDefault("source", "live"))
                .parsedAt(LocalDateTime.now())
                .build()).collect(Collectors.toList());
        return repo.saveAll(records);
    }

    @GetMapping
    public List<TransactionRecord> getAll(@RequestHeader("Authorization") String auth,
                                           @RequestParam(required = false) String category) {
        String userId = authUtil.getUserIdFromToken(auth);
        if (category != null && !category.isBlank()) {
            return repo.findByUserIdAndCategoryOrderByParsedAtDesc(userId, category);
        }
        return repo.findByUserIdOrderByParsedAtDesc(userId);
    }

    @GetMapping("/analytics")
    public Map<String, Object> getAnalytics(@RequestHeader("Authorization") String auth) {
        String userId = authUtil.getUserIdFromToken(auth);

        List<Object[]> catRows = repo.findCategoryTotals(userId);
        List<Map<String, Object>> categoryBreakdown = catRows.stream().map(row -> {
            Map<String, Object> m = new HashMap<>();
            m.put("category", row[0]);
            m.put("total", row[1]);
            m.put("count", row[2]);
            return m;
        }).collect(Collectors.toList());

        Double totalDebit = repo.sumDebitByUser(userId);
        List<TransactionRecord> all = repo.findByUserIdOrderByParsedAtDesc(userId);

        // Daily trend — last 30 days
        Map<String, Double> dailyMap = new LinkedHashMap<>();
        for (TransactionRecord tx : all) {
            if ("Debit".equals(tx.getTransactionType())) {
                String d = tx.getParsedAt().toLocalDate().toString();
                dailyMap.merge(d, tx.getAmount(), Double::sum);
            }
        }
        // Fill last 30 days
        List<Map<String, Object>> dailyTrend = new ArrayList<>();
        for (int i = 29; i >= 0; i--) {
            String d = LocalDateTime.now().minusDays(i).toLocalDate().toString();
            Map<String, Object> entry = new HashMap<>();
            entry.put("date", d);
            entry.put("amount", Math.round(dailyMap.getOrDefault(d, 0.0)));
            dailyTrend.add(entry);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("categoryBreakdown", categoryBreakdown);
        result.put("totalDebit", totalDebit != null ? Math.round(totalDebit) : 0);
        result.put("totalTransactions", all.size());
        result.put("dailyTrend", dailyTrend);
        return result;
    }

    @DeleteMapping("/{id}")
    public Map<String, String> delete(@RequestHeader("Authorization") String auth,
                                       @PathVariable Long id) {
        String userId = authUtil.getUserIdFromToken(auth);
        TransactionRecord tx = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));
        if (!tx.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        repo.delete(tx);
        return Map.of("status", "deleted");
    }
}
