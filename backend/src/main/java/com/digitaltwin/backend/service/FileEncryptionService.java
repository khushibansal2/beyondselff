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
 * If the key is missing/blank, files are stored unencrypted and a warning is logged
 * so the app still works in dev without configuration.
 */
@Service
public class FileEncryptionService {

    private static final String ALGORITHM   = "AES/GCM/NoPadding";
    private static final int    IV_LENGTH   = 12;   // bytes — recommended for GCM
    private static final int    TAG_BITS    = 128;  // GCM authentication tag length

    @Value("${file.encryption.key:}")
    private String encryptionKeyBase64;

    private SecretKey getKey() {
        if (encryptionKeyBase64 == null || encryptionKeyBase64.isBlank()) return null;
        byte[] keyBytes = Base64.getDecoder().decode(encryptionKeyBase64);
        if (keyBytes.length != 32) {
            throw new IllegalStateException("FILE_ENCRYPTION_KEY must be exactly 32 bytes (base64-encoded 256-bit key)");
        }
        return new SecretKeySpec(keyBytes, "AES");
    }

    /**
     * Encrypts plaintext bytes and writes [ IV || ciphertext ] to the target path.
     * Falls back to plain write if key is not configured (logs warning in UploadService).
     */
    public void encryptToFile(byte[] plaintext, Path target) throws Exception {
        SecretKey key = getKey();
        if (key == null) {
            Files.write(target, plaintext);
            return;
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
     * Falls back to plain read if key is not configured.
     */
    public byte[] decryptFromFile(Path source) throws Exception {
        byte[] stored = Files.readAllBytes(source);
        SecretKey key = getKey();
        if (key == null) return stored;

        byte[] iv         = ByteBuffer.wrap(stored, 0, IV_LENGTH).array();
        byte[] ciphertext = new byte[stored.length - IV_LENGTH];
        System.arraycopy(stored, IV_LENGTH, ciphertext, 0, ciphertext.length);

        Cipher cipher = Cipher.getInstance(ALGORITHM);
        cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
        return cipher.doFinal(ciphertext);
    }

    /** Returns true if encryption is active (key is configured). */
    public boolean isEncryptionEnabled() {
        return encryptionKeyBase64 != null && !encryptionKeyBase64.isBlank();
    }
}
