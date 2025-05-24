#!/bin/bash
# Helper script for testing API key authentication with ChronoChimp

# Text colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3000"
API_KEY=""

# Functions
show_help() {
  echo -e "${BLUE}=================================================${NC}"
  echo -e "${BLUE}   ChronoChimp API Key Authentication Helper      ${NC}"
  echo -e "${BLUE}=================================================${NC}"
  echo -e ""
  echo -e "This script helps test API key authentication with ChronoChimp."
  echo -e ""
  echo -e "Usage:"
  echo -e "  $0 [options] [command]"
  echo -e ""
  echo -e "Options:"
  echo -e "  -k, --key API_KEY   Use the specified API key"
  echo -e "  -u, --url BASE_URL  Use the specified base URL (default: http://localhost:3000)"
  echo -e "  -h, --help          Show this help message"
  echo -e ""
  echo -e "Commands:"
  echo -e "  help       Show this help message"
  echo -e "  test       Test the API key by making a simple request to /api/me/profile"
  echo -e "  tasks      List tasks using the API key"
  echo -e "  profile    Get user profile using the API key"
  echo -e ""
  echo -e "Examples:"
  echo -e "  $0 --key YOUR_API_KEY test"
  echo -e "  $0 --key YOUR_API_KEY tasks"
  echo -e "  $0 --key YOUR_API_KEY --url https://your-app.com profile"
  echo -e ""
}

test_api_key() {
  echo -e "${CYAN}Testing API key authentication...${NC}"
  
  if [ -z "$API_KEY" ]; then
    echo -e "${RED}Error: No API key provided. Use the -k or --key option.${NC}"
    exit 1
  fi
  
  response=$(curl -s -X GET \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    "$BASE_URL/api/me/profile")
  
  if echo "$response" | grep -q "Unauthorized"; then
    echo -e "${RED}Authentication failed${NC}"
    echo "$response"
    exit 1
  else
    echo -e "${GREEN}Authentication successful!${NC}"
    echo -e "Response:"
    echo "$response" | sed 's/^/  /'
  fi
}

list_tasks() {
  echo -e "${CYAN}Fetching tasks using API key...${NC}"
  
  if [ -z "$API_KEY" ]; then
    echo -e "${RED}Error: No API key provided. Use the -k or --key option.${NC}"
    exit 1
  fi
  
  response=$(curl -s -X GET \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    "$BASE_URL/api/tasks")
  
  if echo "$response" | grep -q "Unauthorized"; then
    echo -e "${RED}Authentication failed${NC}"
    echo "$response"
    exit 1
  else
    echo -e "${GREEN}Tasks fetched successfully!${NC}"
    echo -e "Response:"
    echo "$response" | sed 's/^/  /'
  fi
}

get_profile() {
  echo -e "${CYAN}Fetching user profile using API key...${NC}"
  
  if [ -z "$API_KEY" ]; then
    echo -e "${RED}Error: No API key provided. Use the -k or --key option.${NC}"
    exit 1
  fi
  
  response=$(curl -s -X GET \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    "$BASE_URL/api/me/profile")
  
  if echo "$response" | grep -q "Unauthorized"; then
    echo -e "${RED}Authentication failed${NC}"
    echo "$response"
    exit 1
  else
    echo -e "${GREEN}Profile fetched successfully!${NC}"
    echo -e "Response:"
    echo "$response" | sed 's/^/  /'
  fi
}

# Parse arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    -k|--key) API_KEY="$2"; shift ;;
    -u|--url) BASE_URL="$2"; shift ;;
    -h|--help) show_help; exit 0 ;;
    help) show_help; exit 0 ;;
    test) COMMAND="test"; ;;
    tasks) COMMAND="tasks"; ;;
    profile) COMMAND="profile"; ;;
    *) echo "Unknown parameter: $1"; show_help; exit 1 ;;
  esac
  shift
done

# Execute command
case ${COMMAND:-help} in
  test) test_api_key ;;
  tasks) list_tasks ;;
  profile) get_profile ;;
  *) show_help ;;
esac
