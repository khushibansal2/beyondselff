package com.digitaltwin.backend.normalizer;

import com.digitaltwin.backend.entity.HealthRecord;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Map;

@Service
public class HealthNormalizer {

    public HealthRecord normalize(Map<String, String> row, String userId, Long importId) {
        HealthRecord record = HealthRecord.builder()
                .userId(userId)
                .importId(importId)
                .source("csv_import")
                .createdAt(LocalDateTime.now())
                .build();

        for (Map.Entry<String, String> entry : row.entrySet()) {
            String key = entry.getKey().toLowerCase();
            String val = entry.getValue().trim();
            if (val.isEmpty()) continue;

            try {
                if (key.contains("date")) {
                    record.setRecordDate(parseDate(val));
                } else if (key.contains("sleep")) {
                    record.setSleepHours(Double.parseDouble(val));
                } else if (key.contains("stress")) {
                    record.setStressLevel(Integer.parseInt(val));
                } else if (key.contains("mood")) {
                    record.setMoodScore(Integer.parseInt(val));
                } else if (key.contains("workout") || key.contains("exercise")) {
                    record.setWorkoutMinutes(Integer.parseInt(val));
                } else if (key.contains("water") || key.contains("hydration")) {
                    record.setWaterGlasses(Integer.parseInt(val));
                } else if (key.contains("calorie")) {
                    record.setCalories(Integer.parseInt(val));
                }
            } catch (Exception e) {
                // Ignore parse errors for specific fields to save partial data
            }
        }
        
        // Ensure date exists
        if (record.getRecordDate() == null) {
            record.setRecordDate(LocalDate.now());
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
                return LocalDate.now();
            }
        }
    }
}
