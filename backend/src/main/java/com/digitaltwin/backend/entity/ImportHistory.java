package com.digitaltwin.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.LocalDateTime;

@Entity
@Table(name = "import_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImportHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private String originalFilename;

    @Column(nullable = false)
    private String storagePath;

    @Column(nullable = false)
    private String mimeType;

    private String fileType;        // csv, xlsx, pdf, json
    private String detectedDomain;  // health, finance, career, unknown
    private String source;          // file, github, google_fit, etc.

    private int recordCount;
    private int validCount;
    private int invalidCount;

    @Enumerated(EnumType.STRING)
    private ImportStatus status;

    private String errorMessage;

    @Column(length = 4000)
    private String columnHeaders;   // JSON array of detected headers

    @Column(columnDefinition = "TEXT")
    private String sampleData;      // JSON of first 3 rows

    private LocalDateTime uploadedAt;
    private LocalDateTime parsedAt;

    public enum ImportStatus {
        UPLOADED, PARSING, SUCCESS, PARTIAL, FAILED
    }
}
