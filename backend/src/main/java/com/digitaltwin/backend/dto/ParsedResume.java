package com.digitaltwin.backend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ParsedResume {

    private String name;
    private String email;
    private String phone;
    private String location;
    private String summary;

    private List<String> skills;
    private List<WorkExperience> experience;
    private List<Education> education;
    private List<String> projects;
    private List<String> certifications;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkExperience {
        private String company;
        private String title;
        private String duration;
        private String description;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Education {
        private String institution;
        private String degree;
        private String year;
    }
}
