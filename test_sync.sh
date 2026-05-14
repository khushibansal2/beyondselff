#!/bin/bash

# Test 1: Signup User A and sync some dummy state
echo "TEST 1: Creating User A and syncing state..."
RES_A=$(curl -s -X POST http://localhost:8080/api/auth/signup -H "Content-Type: application/json" -d '{"name": "Alpha", "email": "alpha@test.com", "password": "password123"}')
TOKEN_A=$(echo $RES_A | grep -o '"token":"[^"]*' | grep -o '[^"]*$')

# Save state
curl -s -X POST http://localhost:8080/api/state -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" -d '{"revision": 0, "statePayload": "{\"health\": {\"sleep\": 8}}"}'

# Test 2: Retrieve state for User A
echo "TEST 2: Retrieving state for User A..."
curl -s http://localhost:8080/api/state -H "Authorization: Bearer $TOKEN_A" | grep '"sleep": 8' > /dev/null
if [ $? -eq 0 ]; then echo "User A Restore: OK"; else echo "User A Restore: FAIL"; fi

# Test 3: Conflict Resolution
echo "TEST 3: Simulating conflict for User A..."
CONFLICT_RES=$(curl -s -X POST http://localhost:8080/api/state -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" -d '{"revision": 0, "statePayload": "{\"health\": {\"sleep\": 9}}"}' -w "%{http_code}")
if echo "$CONFLICT_RES" | grep -q "409"; then echo "Conflict Resolution: OK"; else echo "Conflict Resolution: FAIL ($CONFLICT_RES)"; fi

# Test 4: User Isolation
echo "TEST 4: Creating User B and isolating state..."
RES_B=$(curl -s -X POST http://localhost:8080/api/auth/signup -H "Content-Type: application/json" -d '{"name": "Beta", "email": "beta@test.com", "password": "password123"}')
TOKEN_B=$(echo $RES_B | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
curl -s -X POST http://localhost:8080/api/state -H "Authorization: Bearer $TOKEN_B" -H "Content-Type: application/json" -d '{"revision": 0, "statePayload": "{\"finance\": {\"budget\": 1000}}"}'

B_STATE=$(curl -s http://localhost:8080/api/state -H "Authorization: Bearer $TOKEN_B")
if echo "$B_STATE" | grep -q '"sleep": 8'; then echo "User Isolation: LEAKED"; else echo "User Isolation: ISOLATED OK"; fi

# Test 5: Save with correct revision
echo "TEST 5: Resolving conflict and saving User A..."
curl -s -X POST http://localhost:8080/api/state -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" -d '{"revision": 1, "statePayload": "{\"health\": {\"sleep\": 9}}"}'
curl -s http://localhost:8080/api/state -H "Authorization: Bearer $TOKEN_A" | grep '"sleep": 9' > /dev/null
if [ $? -eq 0 ]; then echo "User A Update: OK"; else echo "User A Update: FAIL"; fi

