package com.digitaltwin.backend.service;

import com.digitaltwin.backend.dto.ParsedBankStatement;
import com.digitaltwin.backend.dto.ParsedMedicalReport;
import com.digitaltwin.backend.dto.ParsedResume;
import com.digitaltwin.backend.entity.CareerRecord;
import com.digitaltwin.backend.entity.FinanceRecord;
import com.digitaltwin.backend.entity.HealthRecord;
import com.digitaltwin.backend.entity.ImportHistory;
import com.digitaltwin.backend.entity.Resume;
import com.digitaltwin.backend.normalizer.CareerNormalizer;
import com.digitaltwin.backend.normalizer.FinanceNormalizer;
import com.digitaltwin.backend.normalizer.HealthNormalizer;
import com.digitaltwin.backend.parser.FileParserService;
import com.digitaltwin.backend.repository.CareerRecordRepository;
import com.digitaltwin.backend.repository.FinanceRecordRepository;
import com.digitaltwin.backend.repository.HealthRecordRepository;
import com.digitaltwin.backend.repository.ImportHistoryRepository;
import com.digitaltwin.backend.repository.ResumeRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UploadService {

    private static final Logger log = LoggerFactory.getLogger(UploadService.class);

    private final FileParserService fileParserService;
    private final FileEncryptionService encryptionService;
    private final ImportHistoryRepository importRepo;
    private final HealthRecordRepository healthRepo;
    private final FinanceRecordRepository financeRepo;
    private final CareerRecordRepository careerRepo;
    private final ResumeRepository resumeRepo;
    private final ResumeParserService resumeParserService;
    private final PdfLlmParserService pdfLlmParserService;
    private final HealthNormalizer healthNormalizer;
    private final FinanceNormalizer financeNormalizer;
    private final CareerNormalizer careerNormalizer;
    private final ObjectMapper objectMapper;

    @Value("${upload.dir}")
    private String uploadDir;

    public UploadService(FileParserService fileParserService, FileEncryptionService encryptionService,
                         ImportHistoryRepository importRepo,
                         HealthRecordRepository healthRepo, FinanceRecordRepository financeRepo,
                         CareerRecordRepository careerRepo, ResumeRepository resumeRepo,
                         ResumeParserService resumeParserService,
                         PdfLlmParserService pdfLlmParserService,
                         HealthNormalizer healthNormalizer,
                         FinanceNormalizer financeNormalizer, CareerNormalizer careerNormalizer) {
        this.fileParserService = fileParserService;
        this.encryptionService = encryptionService;
        this.importRepo = importRepo;
        this.healthRepo = healthRepo;
        this.financeRepo = financeRepo;
        this.careerRepo = careerRepo;
        this.resumeRepo = resumeRepo;
        this.resumeParserService = resumeParserService;
        this.pdfLlmParserService = pdfLlmParserService;
        this.healthNormalizer = healthNormalizer;
        this.financeNormalizer = financeNormalizer;
        this.careerNormalizer = careerNormalizer;
        this.objectMapper = new ObjectMapper();
    }

    @Transactional
    public ImportHistory processFile(MultipartFile file, String userId) throws Exception {
        // 1. Save file to disk
        File dir = new File(uploadDir);
        if (!dir.exists()) dir.mkdirs();

        // Append .enc suffix to signal the file is AES-256-GCM encrypted at rest
        String filename = UUID.randomUUID() + "_" + file.getOriginalFilename() + ".enc";
        Path targetLocation = Paths.get(uploadDir).resolve(filename);

        if (!encryptionService.isEncryptionEnabled()) {
            log.warn("FILE_ENCRYPTION_KEY not set — uploaded file stored WITHOUT encryption: {}", filename);
        }
        encryptionService.encryptToFile(file.getBytes(), targetLocation);

        ImportHistory history = ImportHistory.builder()
                .userId(userId)
                .originalFilename(file.getOriginalFilename())
                .storagePath(targetLocation.toString())
                .mimeType(file.getContentType())
                .uploadedAt(LocalDateTime.now())
                .status(ImportHistory.ImportStatus.PARSING)
                .build();
        
        history = importRepo.save(history);

        try {
            // 2. Parse file
            FileParserService.ParseResult result = fileParserService.parseFile(file);
            history.setFileType(result.type);
            history.setRecordCount(result.data.size());
            history.setColumnHeaders(objectMapper.writeValueAsString(result.headers));
            
            // Generate preview sample
            List<Map<String, String>> sample = result.data.stream().limit(3).collect(Collectors.toList());
            history.setSampleData(objectMapper.writeValueAsString(sample));

            // 3. Detect domain & Normalize
            String domain = detectDomain(result.headers, result.type, file.getOriginalFilename());
            history.setDetectedDomain(domain);
            
            int valid = 0;
            if (domain.equals("health")) {
                if (result.type.equals("pdf")) {
                    String rawText = result.data.isEmpty() ? "" : result.data.get(0).getOrDefault("raw_text", "");
                    ParsedMedicalReport report = pdfLlmParserService.parseMedicalReport(rawText);
                    // Convert each extracted metric to a HealthRecord row
                    if (report.getMetrics() != null && !report.getMetrics().isEmpty()) {
                        for (ParsedMedicalReport.Metric metric : report.getMetrics()) {
                            Map<String, String> row = new java.util.HashMap<>();
                            row.put("date", report.getReportDate() != null ? report.getReportDate() : "");
                            row.put(normalizeMetricKey(metric.getName()), metric.getValue());
                            HealthRecord rec = healthNormalizer.normalize(row, userId, history.getId());
                            healthRepo.save(rec);
                            valid++;
                        }
                    } else {
                        // No metrics extracted — save a single row with raw summary as note
                        Map<String, String> row = new java.util.HashMap<>();
                        row.put("date", report.getReportDate() != null ? report.getReportDate() : "");
                        HealthRecord rec = healthNormalizer.normalize(row, userId, history.getId());
                        healthRepo.save(rec);
                        valid = 1;
                    }
                    log.info("Medical PDF parsed via LLM: {} health records created", valid);
                } else {
                    for (Map<String, String> row : result.data) {
                        HealthRecord rec = healthNormalizer.normalize(row, userId, history.getId());
                        healthRepo.save(rec);
                        valid++;
                    }
                }
            } else if (domain.equals("finance")) {
                if (result.type.equals("pdf")) {
                    String rawText = result.data.isEmpty() ? "" : result.data.get(0).getOrDefault("raw_text", "");
                    ParsedBankStatement statement = pdfLlmParserService.parseBankStatement(rawText);
                    if (statement.getTransactions() != null) {
                        for (ParsedBankStatement.Transaction tx : statement.getTransactions()) {
                            Map<String, String> row = new java.util.HashMap<>();
                            row.put("date", tx.getDate() != null ? tx.getDate() : "");
                            row.put("description", tx.getDescription() != null ? tx.getDescription() : "");
                            row.put("amount", tx.getAmount() != null ? String.valueOf(tx.getAmount()) : "0");
                            row.put("category", tx.getCategory() != null ? tx.getCategory() : "Other");
                            row.put("type", tx.getType() != null ? tx.getType() : "debit");
                            row.put("merchant", tx.getMerchant() != null ? tx.getMerchant() : "");
                            FinanceRecord rec = financeNormalizer.normalize(row, userId, history.getId());
                            financeRepo.save(rec);
                            valid++;
                        }
                    }
                    log.info("Bank statement PDF parsed via LLM: {} finance records created", valid);
                } else {
                    for (Map<String, String> row : result.data) {
                        FinanceRecord rec = financeNormalizer.normalize(row, userId, history.getId());
                        financeRepo.save(rec);
                        valid++;
                    }
                }
            } else if (domain.equals("career")) {
                if (result.type.equals("pdf")) {
                    // Resume PDF → LLM parsing pipeline
                    String rawText = result.data.isEmpty() ? "" : result.data.get(0).getOrDefault("raw_text", "");
                    ParsedResume parsed = resumeParserService.parse(rawText);
                    String parsedJson = objectMapper.writeValueAsString(parsed);
                    String skillsSnapshot = parsed.getSkills() != null
                            ? String.join(", ", parsed.getSkills()) : "";

                    Resume resume = Resume.builder()
                            .userId(userId)
                            .importId(history.getId())
                            .originalFilename(file.getOriginalFilename())
                            .candidateName(parsed.getName())
                            .email(parsed.getEmail())
                            .phone(parsed.getPhone())
                            .location(parsed.getLocation())
                            .summary(parsed.getSummary())
                            .parsedJson(parsedJson)
                            .skillsSnapshot(skillsSnapshot)
                            .llmParsed(resumeParserService.isAvailable())
                            .parsedAt(java.time.LocalDateTime.now())
                            .build();
                    resumeRepo.save(resume);
                    valid = 1;
                } else {
                    for (Map<String, String> row : result.data) {
                        CareerRecord rec = careerNormalizer.normalize(row, userId, history.getId(), result.type);
                        careerRepo.save(rec);
                        valid++;
                    }
                }
            }

            history.setValidCount(valid);
            history.setInvalidCount(result.data.size() - valid);
            history.setStatus(ImportHistory.ImportStatus.SUCCESS);
            history.setParsedAt(LocalDateTime.now());
            
        } catch (Exception e) {
            history.setStatus(ImportHistory.ImportStatus.FAILED);
            history.setErrorMessage(e.getMessage());
        }

        return importRepo.save(history);
    }

    /** Maps LLM metric names to HealthNormalizer field keys. */
    private String normalizeMetricKey(String metricName) {
        if (metricName == null) return "note";
        String lower = metricName.toLowerCase();
        if (lower.contains("heart rate") || lower.contains("pulse")) return "heart_rate";
        if (lower.contains("blood pressure") || lower.contains("bp")) return "blood_pressure";
        if (lower.contains("sleep")) return "sleep";
        if (lower.contains("weight") || lower.contains("bmi")) return "bmi";
        if (lower.contains("stress")) return "stress";
        if (lower.contains("mood")) return "mood";
        if (lower.contains("calorie")) return "calories";
        if (lower.contains("step")) return "steps";
        if (lower.contains("water")) return "water";
        if (lower.contains("workout") || lower.contains("exercise")) return "workout";
        return lower.replace(" ", "_");
    }

    private String detectDomain(String[] headers, String type, String filename) {
        if (type.equals("pdf")) {
            String lower = filename != null ? filename.toLowerCase() : "";
            if (lower.contains("resume") || lower.contains("cv")) return "career";
            if (lower.contains("statement") || lower.contains("bank")) return "finance";
            if (lower.contains("medical") || lower.contains("report")) return "health";
            return "career"; // Default for PDF if unknown
        }

        String joined = String.join(" ", headers).toLowerCase();
        
        if (joined.contains("sleep") || joined.contains("stress") || joined.contains("mood") || 
            joined.contains("workout") || joined.contains("heart") || joined.contains("water") || joined.contains("calories")) {
            return "health";
        }
        
        if (joined.contains("amount") || joined.contains("price") || joined.contains("debit") || 
            joined.contains("credit") || joined.contains("balance") || joined.contains("transaction") || joined.contains("category")) {
            return "finance";
        }
        
        if (joined.contains("study") || joined.contains("code") || joined.contains("dsa") || 
            joined.contains("skill") || joined.contains("commit") || joined.contains("project")) {
            return "career";
        }
        
        // Fallback checks on filename
        String lower = filename != null ? filename.toLowerCase() : "";
        if (lower.contains("health") || lower.contains("fitness")) return "health";
        if (lower.contains("finance") || lower.contains("expense") || lower.contains("bank")) return "finance";
        if (lower.contains("study") || lower.contains("code") || lower.contains("career")) return "career";
        
        return "unknown";
    }

    public List<ImportHistory> getUserHistory(String userId) {
        return importRepo.findByUserIdOrderByUploadedAtDesc(userId);
    }

    @Transactional
    public Map<String, Object> deleteImport(Long id, String userId) {
        ImportHistory history = importRepo.findById(id).orElse(null);
        if (history == null) {
            Map<String, Object> r = new java.util.HashMap<>();
            r.put("deleted", false);
            r.put("reason", "Import not found");
            return r;
        }

        if (!history.getUserId().equals(userId)) {
            log.warn("[SECURITY AUDIT] User {} attempted to delete import ID {} belonging to {}", userId, id, history.getUserId());
            throw new SecurityException("You do not have permission to delete this record.");
        }

        // 1. Cascade-delete all child records for this import batch
        int recordsRemoved = 0;
        String domain = history.getDetectedDomain();
        if ("health".equals(domain)) {
            recordsRemoved = healthRepo.countByImportId(id);
            healthRepo.deleteByImportId(id);
        } else if ("finance".equals(domain)) {
            recordsRemoved = financeRepo.countByImportId(id);
            financeRepo.deleteByImportId(id);
        } else if ("career".equals(domain)) {
            recordsRemoved = careerRepo.countByImportId(id);
            careerRepo.deleteByImportId(id);
        }

        // 2. Delete the encrypted file from disk
        String storagePath = history.getStoragePath();
        if (storagePath != null) {
            try {
                java.nio.file.Files.deleteIfExists(java.nio.file.Paths.get(storagePath));
            } catch (Exception e) {
                log.warn("Could not delete uploaded file {}: {}", storagePath, e.getMessage());
            }
        }

        // 3. Delete the import history row itself
        importRepo.deleteById(id);

        Map<String, Object> r = new java.util.HashMap<>();
        r.put("deleted", true);
        r.put("recordsRemoved", recordsRemoved);
        r.put("domain", domain != null ? domain : "unknown");
        r.put("filename", history.getOriginalFilename());
        return r;
    }
}
