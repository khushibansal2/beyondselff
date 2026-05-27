# 🔒 Security Verification Guide (Manual Testing)

Welcome! This guide allows you to manually verify the enterprise-grade security architecture implemented in the Personal Digital Twin platform. Our system uses a zero-trust backend model, meaning the frontend has zero direct access to sensitive resources (like AI keys) and the backend strictly validates every request.

---

## 1. Authentication & JWT Validation

The backend uses signed JWTs (HMAC-SHA256, 256-bit key) for all session management.

### ✅ Test 1.1: Valid Login Flow (Public Route)
*The login endpoint is public and issues a signed JWT upon validating BCrypt-hashed credentials.*
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```
**Expected Response:** `200 OK` with JSON containing `"token": "eyJhbG..."`.

### ❌ Test 1.2: Missing Token Rejection
*Attempting to access a protected route without a token.*
```bash
curl -X GET http://localhost:8080/api/records/health
```
**Expected Response:** `401 Unauthorized`
```json
{
  "timestamp": "2025-XX-XXT...",
  "status": 401,
  "error": "Missing or malformed Authorization header",
  "path": "/api/records/health"
}
```

### ❌ Test 1.3: Tampered Token Rejection
*Attempting to forge a token by modifying the payload (or using the frontend demo token `dt_jwt_...`).*
```bash
curl -X GET http://localhost:8080/api/records/health \
  -H "Authorization: Bearer dt_jwt_fake123"
```
**Expected Response:** `401 Unauthorized`
*The server detects this is not cryptographically signed and immediately drops the connection.*

---

## 2. RBAC & Strict Data Ownership

Even with a valid token, users can ONLY access their own data.

### ❌ Test 2.1: Cross-User Data Access Prevention
*Assume you are logged in as User A, but try to fetch/modify User B's health records.*
```bash
# Attempt to fetch User B's record (ID: 5) using User A's token
curl -X GET http://localhost:8080/api/records/health/5 \
  -H "Authorization: Bearer <USER_A_TOKEN>"
```
**Expected Response:** `403 Forbidden`
*The backend's `RecordController` verifies that the `userId` in the token does not match the `userId` of the record owner.*

---

## 3. Rate Limiting & Brute Force Protection (WOW Factor)

The authentication endpoints are protected against credential stuffing.

### ❌ Test 3.1: Triggering Rate Limiter
*Run this loop to simulate a brute force attack:*
```bash
for i in {1..6}; do
  curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"wrong"}'
done
```
**Expected Response on 6th attempt:** `429 Too Many Requests`
```json
{
  "error": "Too many failed attempts. Please try again later."
}
```

---

## 4. File Upload Validation & Security (WOW Factor)

The upload endpoint protects against remote code execution (RCE) and massive payloads.

### ❌ Test 4.1: Dangerous Extension Rejection
*Attempt to upload a bash script:*
```bash
curl -X POST http://localhost:8080/api/uploads \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -F "file=@/tmp/malicious.sh"
```
**Expected Response:** `400 Bad Request` - `"Dangerous file extensions are not allowed"`

---

## 5. AI Privacy & Sanitization

The frontend **never** holds the Groq API key (check the `.env` file—it is gone). The frontend asks the backend to talk to the AI. 

### ✅ Test 5.1: AI PII Redaction
*When the backend calls Groq, it strips personally identifiable information (PII).*
Look at `backend/src/main/java/com/digitaltwin/backend/controller/AIProxyController.java`:
The server calls `anonymizeContext()` before sending data, ensuring names, emails, and exact IDs never leave your infrastructure.

### ✅ Test 5.2: Fallback Engine
*If Groq goes down (or the API key is missing), the system does not crash.*
Turn off the server's internet or remove the `GROQ_API_KEY` from `backend/.env`.
Then, attempt to fetch a dashboard narrative. The server will return `503 Service Unavailable`, and the React frontend will instantly fallback to its local, deterministic math engine, showing a highly accurate narrative without relying on external APIs.

---

## 6. HTTP Security Headers (WOW Factor)

The API automatically injects modern security headers on all responses to protect the browser.
```bash
curl -I -X GET http://localhost:8080/api/auth/login
```
**Expected Headers:**
*   `X-Content-Type-Options: nosniff`
*   `X-Frame-Options: DENY`
*   `Content-Security-Policy: default-src 'self'`
*   `Referrer-Policy: strict-origin-when-cross-origin`
