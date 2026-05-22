package com.digitaltwin.backend.normalizer;

import com.digitaltwin.backend.entity.FinanceRecord;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Map;

@Service
public class FinanceNormalizer {

    public FinanceRecord normalize(Map<String, String> row, String userId, Long importId) {
        FinanceRecord record = FinanceRecord.builder()
                .userId(userId)
                .importId(importId)
                .source("csv_import")
                .createdAt(LocalDateTime.now())
                .isImpulse(false)
                .build();

        for (Map.Entry<String, String> entry : row.entrySet()) {
            String key = entry.getKey().toLowerCase();
            String val = entry.getValue().trim();
            if (val.isEmpty()) continue;

            try {
                if (key.contains("date")) {
                    record.setTransactionDate(parseDate(val));
                } else if (key.contains("amount") || key.contains("price")) {
                    String cleanAmount = val.replaceAll("[^\\d.-]", "");
                    BigDecimal amt = new BigDecimal(cleanAmount);
                    if (amt.compareTo(BigDecimal.ZERO) < 0) {
                        record.setTransactionType("debit");
                        record.setAmount(amt.abs());
                    } else {
                        // Guess debit/credit based on typical CSV formats if unsigned
                        if (record.getTransactionType() == null) {
                             record.setTransactionType("debit"); // assume expense by default unless labeled credit
                        }
                        record.setAmount(amt);
                    }
                } else if (key.contains("type") || key.contains("cr/dr")) {
                    if (val.toLowerCase().contains("cr") || val.toLowerCase().contains("credit")) {
                        record.setTransactionType("credit");
                    } else {
                        record.setTransactionType("debit");
                    }
                } else if (key.contains("category")) {
                    record.setCategory(val);
                } else if (key.contains("description") || key.contains("narration") || key.contains("merchant")) {
                    record.setDescription(val);
                    record.setMerchant(extractMerchant(val));
                }
            } catch (Exception e) {
                // Ignore parsing errors for individual fields
            }
        }

        // Basic default fallbacks
        if (record.getTransactionDate() == null) record.setTransactionDate(LocalDate.now());
        if (record.getAmount() == null) record.setAmount(BigDecimal.ZERO);
        if (record.getTransactionType() == null) record.setTransactionType("debit");
        
        // Simple heuristic for emotional/impulse spending
        if (record.getTransactionType().equals("debit") && record.getCategory() != null) {
            String cat = record.getCategory().toLowerCase();
            if (cat.contains("food") || cat.contains("entertainment") || cat.contains("shopping")) {
                // Here we might link with late night, but without time we just flag randomly for demo or leave false
                // To be realistic, we need transaction time. We assume false for now.
            }
        }

        return record;
    }

    private LocalDate parseDate(String val) {
        try {
            return LocalDate.parse(val, DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (DateTimeParseException e) {
            try {
                return LocalDate.parse(val, DateTimeFormatter.ofPattern("MM/dd/yyyy"));
            } catch (DateTimeParseException e2) {
                try {
                    return LocalDate.parse(val, DateTimeFormatter.ofPattern("dd/MM/yyyy"));
                } catch (DateTimeParseException e3) {
                    return LocalDate.now();
                }
            }
        }
    }

    private String extractMerchant(String desc) {
        if (desc == null) return "Unknown";
        String[] parts = desc.split("(?i)(via|at|to|-)\\s+");
        if (parts.length > 1) {
            return parts[parts.length - 1].trim();
        }
        return desc.substring(0, Math.min(desc.length(), 20));
    }
}
