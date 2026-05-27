package com.digitaltwin.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

/**
 * LinkedIn Mock Controller — returns realistic professional profile data.
 * LinkedIn's public API requires partnership approval; this demo layer lets the
 * Career page import structured profile data without a real OAuth flow.
 *
 * GET /api/linkedin/profile?username=  → mock professional profile
 * GET /api/linkedin/sync?userId=       → career record ready for import
 * GET /api/linkedin/status?userId=     → always "demo" mode
 */
@RestController
@RequestMapping("/api/linkedin")
@CrossOrigin(origins = "*")
public class LinkedInController {

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status(
            @RequestParam(defaultValue = "default") String userId) {
        Map<String, Object> r = new LinkedHashMap<String, Object>();
        r.put("connected", true);
        r.put("mode", "demo");
        r.put("note", "LinkedIn Public API requires partnership approval. Demo data is returned.");
        return ResponseEntity.ok(r);
    }

    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> profile(
            @RequestParam(defaultValue = "user") String username) {
        return ResponseEntity.ok(buildProfile(username));
    }

    @GetMapping("/sync")
    public ResponseEntity<Map<String, Object>> sync(
            @RequestParam(defaultValue = "default") String userId) {
        Map<String, Object> profile = buildProfile("user");
        Map<String, Object> r = new LinkedHashMap<String, Object>();
        r.put("connected", true);
        r.put("mode", "demo");
        r.put("syncedAt", LocalDate.now().toString());
        r.put("profile", profile);
        r.put("careerRecord", buildCareerRecord(profile));
        r.put("skills", profile.get("skills"));
        r.put("experience", profile.get("experience"));
        return ResponseEntity.ok(r);
    }

    // ── Builders ─────────────────────────────────────────────────────────────

    private Map<String, Object> buildProfile(String username) {
        String name = "user".equals(username) ? "Arjun Mehta" : capitalize(username);

        List<String> skills = Arrays.asList(
                "Java", "Spring Boot", "React", "Node.js", "PostgreSQL",
                "Docker", "AWS", "Data Structures", "System Design", "Python");

        // Experience entries
        Map<String, Object> exp1 = new LinkedHashMap<String, Object>();
        exp1.put("title",    "Software Engineering Intern");
        exp1.put("company",  "TechStartup Pvt Ltd");
        exp1.put("duration", "Jun 2024 – Present");
        exp1.put("location", "Remote");
        exp1.put("skills",   Arrays.asList("React", "Node.js", "PostgreSQL"));

        Map<String, Object> exp2 = new LinkedHashMap<String, Object>();
        exp2.put("title",    "Open Source Contributor");
        exp2.put("company",  "GitHub");
        exp2.put("duration", "Jan 2024 – Present");
        exp2.put("location", "Remote");
        exp2.put("skills",   Arrays.asList("Java", "Spring Boot", "Docker"));

        List<Object> experience = new ArrayList<Object>();
        experience.add(exp1);
        experience.add(exp2);

        // Education
        Map<String, Object> edu = new LinkedHashMap<String, Object>();
        edu.put("school", "VIT University");
        edu.put("degree", "B.Tech Computer Science");
        edu.put("years",  "2022 – 2026");
        edu.put("grade",  "8.4 CGPA");
        List<Object> education = new ArrayList<Object>();
        education.add(edu);

        // Certifications
        Map<String, Object> cert1 = new LinkedHashMap<String, Object>();
        cert1.put("name",   "AWS Cloud Practitioner");
        cert1.put("issuer", "Amazon Web Services");
        cert1.put("year",   "2024");

        Map<String, Object> cert2 = new LinkedHashMap<String, Object>();
        cert2.put("name",   "Meta Front-End Developer");
        cert2.put("issuer", "Coursera");
        cert2.put("year",   "2023");

        List<Object> certifications = new ArrayList<Object>();
        certifications.add(cert1);
        certifications.add(cert2);

        List<String> projects = Arrays.asList(
                "BeyondSelf Digital Twin — AI life management app (React + Spring Boot)",
                "LeetCode tracker CLI — automated problem sync via GitHub Actions",
                "Expense Manager — PWA with offline-first architecture");

        Map<String, Object> profile = new LinkedHashMap<String, Object>();
        profile.put("name",           name);
        profile.put("headline",       "Software Engineer | Full Stack | Open to Work");
        profile.put("location",       "Bengaluru, Karnataka, India");
        profile.put("connections",    487);
        profile.put("followers",      512);
        profile.put("summary",        "Passionate developer with experience in React, Spring Boot, and cloud. Currently preparing for product-based company placements. Active open-source contributor.");
        profile.put("skills",         skills);
        profile.put("experience",     experience);
        profile.put("education",      education);
        profile.put("certifications", certifications);
        profile.put("projects",       projects);
        profile.put("openToWork",     true);
        profile.put("profileUrl",     "https://linkedin.com/in/" + username);
        profile.put("source",         "linkedin_demo");
        return profile;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> buildCareerRecord(Map<String, Object> profile) {
        List<String> skills   = (List<String>) profile.get("skills");
        List<Object> expList  = (List<Object>) profile.get("experience");
        List<String> projects = (List<String>) profile.get("projects");

        Map<String, Object> rec = new LinkedHashMap<String, Object>();
        rec.put("activityDate",      LocalDate.now().toString());
        rec.put("skillLearned",      (skills != null && !skills.isEmpty()) ? skills.get(0) : "Software Development");
        rec.put("extractedSkills",   skills   != null ? skills   : Collections.<String>emptyList());
        rec.put("yearsExperience",   expList  != null ? expList.size() : 0);
        rec.put("githubCommits",     42);
        rec.put("source",            "linkedin_demo");
        rec.put("extractedProjects", projects != null ? projects : Collections.<String>emptyList());
        return rec;
    }

    private String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1).toLowerCase();
    }
}
