#!/bin/bash

# Set your Supabase URL and anon key
SUPABASE_URL="http://127.0.0.1:54321"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

# Path to the EPUB file
EPUB_FILE="/Users/anastasiakim/HarmonicAIv3/The Alchemist by Paulo Coelho.epub"

# Create a test user and get a JWT token
echo "Creating test user..."
USER_JSON=$(curl -s -X POST "$SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "testuser@example.com", "password": "testpassword"}')

# Extract the JWT token from the response
JWT_TOKEN=$(echo $USER_JSON | jq -r '.access_token')

if [ -z "$JWT_TOKEN" ] || [ "$JWT_TOKEN" = "null" ]; then
  echo "Failed to create test user. Attempting to sign in..."
  # Try to sign in if user already exists
  USER_JSON=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
    -H "apikey: $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"email": "testuser@example.com", "password": "testpassword"}')
  
  JWT_TOKEN=$(echo $USER_JSON | jq -r '.access_token')
  
  if [ -z "$JWT_TOKEN" ] || [ "$JWT_TOKEN" = "null" ]; then
    echo "Failed to authenticate. Please check your Supabase instance."
    exit 1
  fi
fi

echo "Successfully authenticated with JWT token: ${JWT_TOKEN:0:20}..."

# Upload the EPUB file
echo "Uploading EPUB file: $EPUB_FILE"

# Make the request to upload the EPUB using curl's built-in form handling
RESPONSE=$(curl -s -X POST "$SUPABASE_URL/functions/v1/upload-ebook" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@\"$EPUB_FILE\";type=application/epub+zip")

# Print the response
echo "Upload response:"
echo "$RESPONSE" | jq .

# Check if the upload was successful
if echo "$RESPONSE" | jq -e '.ebook_id' > /dev/null; then
  echo "EPUB uploaded successfully! Ebook ID: $(echo "$RESPONSE" | jq -r '.ebook_id')"
  echo "You can check the Supabase Studio at http://127.0.0.1:54323 to see the uploaded ebook and generated chapters."
  
  # If upload was successful, wait a moment and then check the chapters
  if [ "$(echo "$RESPONSE" | jq -r '.ebook_id')" != "null" ]; then
    ECHO "Waiting a few seconds for chapter processing..."
    sleep 5
    
    # Get the ebook ID from the response
    EBOOK_ID=$(echo "$RESPONSE" | jq -r '.ebook_id')
    
    # Check if chapters were created
    echo "Checking for chapters..."
    CHAPTERS_RESPONSE=$(curl -s -X GET "$SUPABASE_URL/rest/v1/chapters?ebook_id=eq.$EBOOK_ID" \
      -H "apikey: $ANON_KEY" \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -H "Content-Type: application/json")
    
    echo "Chapters found: $(echo "$CHAPTERS_RESPONSE" | jq '. | length')"
    echo "First few chapters:"
    echo "$CHAPTERS_RESPONSE" | jq '.[] | {id: .id, title: .title, order_index: .order_index, status: .status}'
  fi
else
  echo "Failed to upload EPUB. Response:"
  echo "$RESPONSE" | jq .
  
  # If there's an error, try to get more details from the function logs
  echo "\nChecking function logs..."
  LOGS=$(curl -s -X GET "$SUPABASE_URL/functions/v1/admin/logs?name=upload-ebook" \
    -H "Authorization: Bearer $JWT_TOKEN")
  
  if [ -n "$LOGS" ] && [ "$LOGS" != "null" ]; then
    echo "Function logs:"
    echo "$LOGS" | jq .
  else
    echo "No logs available."
  fi
fi
