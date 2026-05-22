#!/bin/bash
TOKEN_A=$(curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"email": "alice@test.com", "password": "password123"}' | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
TOKEN_B=$(curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"email": "bob@test.com", "password": "password123"}' | grep -o '"token":"[^"]*' | grep -o '[^"]*$')

echo "Uploading as User A..."
UPLOAD_RES=$(curl -s -X POST http://localhost:8080/api/uploads \
  -H "Authorization: Bearer $TOKEN_A" \
  -F "file=@/Users/gubbapavani/new wise/dummy.csv;type=text/csv")
IMPORT_ID=$(echo $UPLOAD_RES | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo "Import ID: $IMPORT_ID"

echo "User A History:"
curl -s http://localhost:8080/api/uploads/history -H "Authorization: Bearer $TOKEN_A" | grep '"id":' > /dev/null
if [ $? -eq 0 ]; then echo "User A History: OK"; else echo "User A History: FAIL"; fi

echo "User B History:"
HISTORY_B=$(curl -s http://localhost:8080/api/uploads/history -H "Authorization: Bearer $TOKEN_B")
if [ "$HISTORY_B" = "[]" ]; then echo "User B History: ISOLATED"; else echo "User B History: LEAKED"; fi

echo "User B trying to delete User A's file..."
DEL_RES=$(curl -s -X DELETE http://localhost:8080/api/uploads/$IMPORT_ID -H "Authorization: Bearer $TOKEN_B" -w "%{http_code}")
if echo "$DEL_RES" | grep -q "403"; then echo "Delete as B: FORBIDDEN OK"; else echo "Delete as B: FAILED $DEL_RES"; fi

echo "User A trying to delete User A's file..."
DEL_RES2=$(curl -s -X DELETE http://localhost:8080/api/uploads/$IMPORT_ID -H "Authorization: Bearer $TOKEN_A" -w "%{http_code}")
if echo "$DEL_RES2" | grep -q "200"; then echo "Delete as A: SUCCESS OK"; else echo "Delete as A: FAILED $DEL_RES2"; fi

