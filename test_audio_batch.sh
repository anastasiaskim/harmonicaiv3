#!/bin/bash

# Set your Supabase URL and anon key
SUPABASE_URL="http://127.0.0.1:54321"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

# Create a test user and get a JWT token
echo "Creating test user..."
USER_JSON=$(curl -s -X POST "$SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "testuser_'$(date +%s)'@example.com", "password": "testpassword"}')

echo "User creation response: $USER_JSON"
JWT_TOKEN=$(echo "$USER_JSON" | jq -r '.access_token // empty')

if [ -z "$JWT_TOKEN" ] || [ "$JWT_TOKEN" = "null" ]; then
  echo "Failed to create test user. Attempting to sign in..."
  # Try to sign in if user already exists
  USER_JSON=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
    -H "apikey: $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"email": "testuser@example.com", "password": "testpassword"}')
  
  echo "Sign in response: $USER_JSON"
  JWT_TOKEN=$(echo "$USER_JSON" | jq -r '.access_token // empty')
  
  if [ -z "$JWT_TOKEN" ] || [ "$JWT_TOKEN" = "null" ]; then
    echo "Failed to authenticate. Please check your Supabase instance."
    exit 1
  fi
fi

echo "Successfully authenticated with JWT token: ${JWT_TOKEN:0:20}..."

# Get the latest ebook ID from the database
LATEST_EBOOK=$(curl -s -X GET "$SUPABASE_URL/rest/v1/ebooks?select=id&order=created_at.desc&limit=1" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo "Latest ebook: $LATEST_EBOOK"
EBOOK_ID=$(echo "$LATEST_EBOOK" | jq -r '.[0].id // empty')

if [ -z "$EBOOK_ID" ]; then
  echo "No ebooks found. Please create an ebook first."
  exit 1
fi

echo "Using ebook ID: $EBOOK_ID"

# Manually invoke the generate-audio-batch function
echo "Invoking generate-audio-batch function..."
RESPONSE=$(curl -s -X POST "$SUPABASE_URL/functions/v1/generate-audio-batch" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"ebook_id\": \"$EBOOK_ID\", \"voice_id\": \"default\"}")

echo "Function response: $RESPONSE"

# Check function logs
echo "\nChecking function logs..."
LOGS=$(curl -s -X GET "$SUPABASE_URL/functions/v1/admin/logs?name=generate-audio-batch" \
  -H "Authorization: Bearer $JWT_TOKEN" 2>&1)

echo "Function logs:"
echo "$LOGS" | jq . 2>/dev/null || echo "Failed to parse logs: $LOGS"
