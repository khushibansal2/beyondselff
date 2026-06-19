package com.digitaltwin.backend.dto;

import java.util.List;

public class ParsedMedicalReport {

    private String patientName;
    private String reportDate;
    private String summary;
    private List<Metric> metrics;
    private List<String> diagnoses;

    public static class Metric {
        private String name;
        private String value;
        private String unit;
        private String status; // "normal", "high", "low"

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getValue() { return value; }
        public void setValue(String value) { this.value = value; }
        public String getUnit() { return unit; }
        public void setUnit(String unit) { this.unit = unit; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }
    public String getReportDate() { return reportDate; }
    public void setReportDate(String reportDate) { this.reportDate = reportDate; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public List<Metric> getMetrics() { return metrics; }
    public void setMetrics(List<Metric> metrics) { this.metrics = metrics; }
    public List<String> getDiagnoses() { return diagnoses; }
    public void setDiagnoses(List<String> diagnoses) { this.diagnoses = diagnoses; }
}
