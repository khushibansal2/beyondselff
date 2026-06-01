package com.digitaltwin.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-256-GCM file encryption service.
 *
 * Stored file format: [ 12-byte IV ][ AES-GCM ciphertext + 16-byte auth tag ]
 *
 * Set FILE_ENCRYPTION_KEY env var (32 bytes, base64-encoded).
 * Generate one with: openssl rand -base64 32
 *
 * If the key is missing/blank, a secure 256-bit key is automatically generated
 * and persisted to the upload directory (.file_encryption_key) to ensure files
 * are always encrypted and accessible across restarts.
 */
@Service
public class FileEncryptionService {

    private static final String ALGORITHM   = "AES/GCM/NoPadding";
    private static final int    IV_LENGTH   = 12;   // bytes — recommended for GCM
    private static final int    TAG_BITS    = 128;  // GCM authentication tag length

    @Value("${file.encryption.key:}")
    private String encryptionKeyBase64;

    @Value("${upload.dir:./uploads}")
    private String uploadDir;

    private SecretKey resolvedKey;

    private synchronized SecretKey getKey() {
        if (resolvedKey != null) {
            return resolvedKey;
        }

        if (encryptionKeyBase64 != null && !encryptionKeyBase64.isBlank() && 
            !"X4l/W9/T942QE7cueDASfJfR4Nszs/KXpg/4D7fohR8=".equals(encryptionKeyBase64.trim())) {
            byte[] keyBytes = Base64.getDecoder().decode(encryptionKeyBase64.trim());
            if (keyBytes.length != 32) {
                throw new IllegalStateException("FILE_ENCRYPTION_KEY must be exactly 32 bytes (base64-encoded 256-bit key)");
            }
            resolvedKey = new SecretKeySpec(keyBytes, "AES");
        } else {
            try {
                Path keyPath = Paths.get(uploadDir).resolve(".file_encryption_key");
                byte[] keyBytes;
                if (Files.exists(keyPath)) {
                    keyBytes = Files.readAllBytes(keyPath);
                    if (keyBytes.length != 32) {
                        keyBytes = generateAndSaveKey(keyPath);
                    }
                } else {
                    Files.createDirectories(keyPath.getParent());
                    keyBytes = generateAndSaveKey(keyPath);
                }
                resolvedKey = new SecretKeySpec(keyBytes, "AES");
            } catch (Exception e) {
                throw new IllegalStateException("Failed to initialize or persist file encryption key", e);
            }
        }
        return resolvedKey;
    }

    private byte[] generateAndSaveKey(Path keyPath) throws Exception {
        byte[] keyBytes = new byte[32];
        new SecureRandom().nextBytes(keyBytes);
        Files.write(keyPath, keyBytes);
        return keyBytes;
    }

    /**
     * Encrypts plaintext bytes and writes [ IV || ciphertext ] to the target path.
     * Enforces encryption (no plaintext fallbacks).
     */
    public void encryptToFile(byte[] plaintext, Path target) throws Exception {
        SecretKey key = getKey();
        if (key == null) {
            throw new IllegalStateException("Encryption key is not available. Refusing to store files in plaintext.");
        }

        byte[] iv = new byte[IV_LENGTH];
        new SecureRandom().nextBytes(iv);

        Cipher cipher = Cipher.getInstance(ALGORITHM);
        cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
        byte[] ciphertext = cipher.doFinal(plaintext);

        // Prepend IV to ciphertext
        byte[] stored = ByteBuffer.allocate(IV_LENGTH + ciphertext.length)
                .put(iv)
                .put(ciphertext)
                .array();

        Files.write(target, stored);
    }

    /**
     * Reads and decrypts a file previously encrypted with encryptToFile().
     */
    public byte[] decryptFromFile(Path source) throws Exception {
        byte[] stored = Files.readAllBytes(source);
        SecretKey key = getKey();
        if (key == null) {
            throw new IllegalStateException("Decryption key is not available.");
        }

        byte[] iv         = ByteBuffer.wrap(stored, 0, IV_LENGTH).array();
        byte[] ciphertext = new byte[stored.length - IV_LENGTH];
        System.arraycopy(stored, IV_LENGTH, ciphertext, 0, ciphertext.length);

        Cipher cipher = Cipher.getInstance(ALGORITHM);
        cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
        return cipher.doFinal(ciphertext);
    }

    /** Returns true if encryption is active (key is configured or generated). */
    public boolean isEncryptionEnabled() {
        return getKey() != null;
    }
}
