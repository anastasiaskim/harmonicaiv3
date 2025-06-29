#!/bin/bash

# Enable debug output
set -x

# Set your Supabase URL and anon key
SUPABASE_URL="http://127.0.0.1:54321"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

# Function to make authenticated requests with better error handling
function make_request() {
  local method=$1
  local url=$2
  local data=$3
  
  local response
  if [ -z "$data" ]; then
    response=$(curl -s -X $method "$url" \
      -H "apikey: $ANON_KEY" \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -H "Content-Type: application/json" 2>&1)
  else
    response=$(curl -s -X $method "$url" \
      -H "apikey: $ANON_KEY" \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=representation" \
      -d "$data" 2>&1)
  fi
  
  if [ $? -ne 0 ]; then
    echo "Error making request to $url:" >&2
    echo "$response" >&2
    return 1
  fi
  
  echo "$response"
  return 0
}

# Create a test user and get a JWT token
echo "Creating test user..."
USER_JSON=$(curl -s -X POST "$SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "testuser_'$(date +%s)'@example.com", "password": "testpassword"}')

echo "User creation response: $USER_JSON"

# Extract the JWT token from the response
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

# Extract user ID from JWT token
USER_ID=$(echo $JWT_TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq -r '.sub')
if [ -z "$USER_ID" ] || [ "$USER_ID" = "null" ]; then
  echo "Failed to extract user ID from JWT token"
  exit 1
fi

echo "Extracted user ID: $USER_ID"

# Create a test ebook first
echo "Creating test ebook..."
EBOOK_DATA='{"title": "Test Ebook for Trigger", "status": "pending", "user_id": "'$USER_ID'"}'
EBOOK_RESPONSE=$(make_request "POST" "$SUPABASE_URL/rest/v1/ebooks" "$EBOOK_DATA")

echo "Ebook creation response: $EBOOK_RESPONSE"
EBOOK_ID=$(echo "$EBOOK_RESPONSE" | jq -r '.[0].id // empty')

if [ -z "$EBOOK_ID" ]; then
  echo "Failed to create test ebook. Response:"
  echo "$EBOOK_RESPONSE" | jq .
  exit 1
fi

echo "Created test ebook with ID: $EBOOK_ID"

# Now insert a test chapter to trigger the function
echo "Inserting test chapter to trigger audio generation..."
CHAPTER_DATA='{"ebook_id": "'$EBOOK_ID'", "title": "Test Chapter", "text_content": "This is a test chapter.", "status": "pending"}'
CHAPTER_RESPONSE=$(make_request "POST" "$SUPABASE_URL/rest/v1/chapters" "$CHAPTER_DATA")

echo "Chapter creation response: $CHAPTER_RESPONSE"
CHAPTER_ID=$(echo "$CHAPTER_RESPONSE" | jq -r '.[0].id // empty')

if [ -z "$CHAPTER_ID" ]; then
  echo "Failed to create test chapter. Response:"
  echo "$CHAPTER_RESPONSE" | jq .
  exit 1
fi

echo "Inserted test chapter with ID: $CHAPTER_ID"

# Wait a moment for the trigger to execute
echo "Waiting for trigger to execute..."
sleep 5

# Check if the chapter status was updated
echo "Checking chapter status..."
CHAPTER_STATUS=$(make_request "GET" "$SUPABASE_URL/rest/v1/chapters?id=eq.$CHAPTER_ID")

echo "Updated chapter status:"
echo "$CHAPTER_STATUS" | jq .

# Check if there are any database triggers
echo "\nChecking for database triggers..."
TRIGGERS=$(make_request "GET" "$SUPABASE_URL/rest/v1/rpc/pg_trigger")
echo "Database triggers:"
echo "$TRIGGERS" | jq .

# Check function logs to see if it was triggered
echo "\nChecking function logs for generate-audio-batch..."
LOGS=$(curl -s -X GET "$SUPABASE_URL/functions/v1/admin/logs?name=generate-audio-batch" \
  -H "Authorization: Bearer $JWT_TOKEN" 2>&1)

echo "Function logs:"
echo "$LOGS" | jq . 2>/dev/null || echo "Failed to parse logs: $LOGS"

# Check if the trigger function exists
echo "\nChecking if trigger function exists..."
FUNCTION_EXISTS=$(make_request "GET" "$SUPABASE_URL/rest/v1/rpc/pg_proc?proname=eq.trigger_generate_audio_batch")
echo "Trigger function details:"
echo "$FUNCTION_EXISTS" | jq .
