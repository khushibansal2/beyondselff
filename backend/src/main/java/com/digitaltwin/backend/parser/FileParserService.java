package com.digitaltwin.backend.parser;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvException;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStreamReader;
import java.io.Reader;
import java.util.*;

@Service
public class FileParserService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public ParseResult parseFile(MultipartFile file) throws Exception {
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        if (filename.endsWith(".csv")) {
            return parseCsv(file);
        } else if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
            return parseExcel(file);
        } else if (filename.endsWith(".pdf")) {
            return parsePdf(file);
        }
        throw new IllegalArgumentException("Unsupported file type");
    }

    private ParseResult parseCsv(MultipartFile file) throws Exception {
        try (Reader reader = new InputStreamReader(file.getInputStream())) {
            CSVReader csvReader = new CSVReader(reader);
            List<String[]> rows = csvReader.readAll();
            if (rows.isEmpty()) return new ParseResult();

            String[] headers = rows.get(0);
            List<Map<String, String>> data = new ArrayList<>();
            for (int i = 1; i < rows.size(); i++) {
                String[] row = rows.get(i);
                Map<String, String> map = new HashMap<>();
                for (int j = 0; j < headers.length && j < row.length; j++) {
                    map.put(headers[j].trim().toLowerCase(), row[j]);
                }
                data.add(map);
            }
            return new ParseResult(headers, data, "csv");
        }
    }

    private ParseResult parseExcel(MultipartFile file) throws Exception {
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rowIterator = sheet.iterator();
            
            if (!rowIterator.hasNext()) return new ParseResult();
            
            Row headerRow = rowIterator.next();
            List<String> headers = new ArrayList<>();
            for (Cell cell : headerRow) {
                headers.add(cell.toString().trim().toLowerCase());
            }

            List<Map<String, String>> data = new ArrayList<>();
            while (rowIterator.hasNext()) {
                Row row = rowIterator.next();
                Map<String, String> map = new HashMap<>();
                for (int i = 0; i < headers.size(); i++) {
                    Cell cell = row.getCell(i, Row.MissingCellPolicy.CREATE_NULL_AS_BLANK);
                    map.put(headers.get(i), cell.toString());
                }
                data.add(map);
            }
            return new ParseResult(headers.toArray(new String[0]), data, "xlsx");
        }
    }

    private ParseResult parsePdf(MultipartFile file) throws Exception {
        try (PDDocument document = org.apache.pdfbox.Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);
            
            Map<String, String> map = new HashMap<>();
            map.put("raw_text", text);
            
            return new ParseResult(new String[]{"raw_text"}, List.of(map), "pdf");
        }
    }

    public static class ParseResult {
        public String[] headers;
        public List<Map<String, String>> data;
        public String type;

        public ParseResult() {
            this.headers = new String[0];
            this.data = new ArrayList<>();
        }

        public ParseResult(String[] headers, List<Map<String, String>> data, String type) {
            this.headers = headers;
            this.data = data;
            this.type = type;
        }
    }
}
