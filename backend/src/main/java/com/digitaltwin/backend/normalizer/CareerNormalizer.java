package com.digitaltwin.backend.normalizer;

import com.digitaltwin.backend.entity.CareerRecord;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CareerNormalizer {

    public CareerRecord normalize(Map<String, String> row, String userId, Long importId, String type) {
        CareerRecord record = CareerRecord.builder()
                .userId(userId)
                .importId(importId)
                .source(type.equals("pdf") ? "resume_pdf" : "csv_import")
                .createdAt(LocalDateTime.now())
                .build();

        if (type.equals("pdf")) {
            String text = row.get("raw_text");
            if (text != null) {
                record.setActivityDate(LocalDate.now());
                record.setExtractedSkills(extractSkillsFromText(text));
                record.setExtractedProjects(extractProjectsFromText(text));
            }
            return record;
        }

        // CSV/Excel mapping
        for (Map.Entry<String, String> entry : row.entrySet()) {
            String key = entry.getKey().toLowerCase();
            String val = entry.getValue().trim();
            if (val.isEmpty()) continue;

            try {
                if (key.contains("date")) {
                    record.setActivityDate(parseDate(val));
                } else if (key.contains("study")) {
                    record.setStudyHours(Double.parseDouble(val));
                } else if (key.contains("coding") || key.contains("code")) {
                    record.setCodingHours(Double.parseDouble(val));
                } else if (key.contains("dsa") || key.contains("problem") || key.contains("leetcode")) {
                    record.setDsaProblems(Integer.parseInt(val));
                } else if (key.contains("skill") || key.contains("learn")) {
                    record.setSkillLearned(val);
                } else if (key.contains("commit")) {
                    record.setGithubCommits(Integer.parseInt(val));
                } else if (key.contains("language")) {
                    List<String> langs = new ArrayList<>();
                    for (String lang : val.split("[,;]+")) {
                        String trimmed = lang.trim();
                        if (!trimmed.isEmpty()) langs.add(trimmed);
                    }
                    record.setLanguages(langs);
                }
            } catch (Exception e) {
                // ignore specific parse errors
            }
        }

        if (record.getActivityDate() == null) record.setActivityDate(LocalDate.now());

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

    private List<String> extractSkillsFromText(String text) {
        String[] knownSkills = {
            "Java", "Python", "JavaScript", "TypeScript", "React", "Spring Boot",
            "SQL", "AWS", "Docker", "Kubernetes", "Node.js", "C++", "Go", "Rust",
            "MongoDB", "PostgreSQL", "Redis", "GraphQL", "REST"
        };
        List<String> found = new ArrayList<>();
        for (String skill : knownSkills) {
            if (Pattern.compile("\\b" + Pattern.quote(skill) + "\\b", Pattern.CASE_INSENSITIVE)
                    .matcher(text).find()) {
                found.add(skill);
            }
        }
        if (found.isEmpty()) found.add("Unknown Skills");
        return found;
    }

    private List<String> extractProjectsFromText(String text) {
        List<String> projects = new ArrayList<>();
        Matcher m = Pattern.compile("(?i)(projects?|experience).*?\\n(.{10,200})")
                .matcher(text);
        while (m.find() && projects.size() < 5) {
            String title = m.group(2).replaceAll("\\n", " ").trim();
            if (!title.isEmpty()) projects.add(title);
        }
        if (projects.isEmpty()) projects.add("Unknown Projects");
        return projects;
    }
}
