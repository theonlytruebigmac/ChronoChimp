#!/bin/bash
# Test script for checking API authentication across endpoints

# Set these variables before running the script
API_KEY=""  # Add your API key here
BASE_URL="http://localhost:3000/api"  # Change if your server is on a different URL
TASK_ID=""  # Add a task ID for testing specific task endpoints

# Text colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to test an endpoint
# Usage: test_endpoint "GET" "/endpoint/path" "Description"
test_endpoint() {
  local method=$1
  local endpoint=$2
  local description=$3
  
  echo -e "\n===== Testing $description ====="
  echo "Endpoint: $method $endpoint"
  
  response=$(curl -s -X $method \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    "$BASE_URL$endpoint")
  
  # Check if response contains "Unauthorized" or "error"
  if echo "$response" | grep -q "Unauthorized"; then
    echo -e "${RED}✖ FAILED: Authentication failed${NC}"
    echo "$response" | grep -o '"error":"[^"]*"'
  else
    echo -e "${GREEN}✓ SUCCESS: Authentication successful${NC}"
  fi
  
  echo "Response preview: ${response:0:100}..."
}

# Check if API_KEY is provided
if [ -z "$API_KEY" ]; then
  echo -e "${RED}Error: API_KEY is not set. Please edit this script and add your API key.${NC}"
  exit 1
fi

# Test /api/me endpoints
test_endpoint "GET" "/me/profile" "User Profile"
test_endpoint "GET" "/me/api_keys" "List API Keys"

# Test /api/tasks endpoints
test_endpoint "GET" "/tasks" "List Tasks"
if [ ! -z "$TASK_ID" ]; then
  test_endpoint "GET" "/tasks/$TASK_ID" "Get Specific Task"
fi

# Test admin endpoints (these should work if your API key belongs to an admin)
test_endpoint "GET" "/admin/users" "List Users (Admin)"
test_endpoint "GET" "/admin/invites" "List Invites (Admin)"
test_endpoint "GET" "/admin/smtp-status" "SMTP Status (Admin)"

echo -e "\n===== Authentication Testing Complete ====="
