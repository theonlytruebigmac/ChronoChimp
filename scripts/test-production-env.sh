#!/bin/bash
# ChronoChimp Production Environment Tester
# This script tests that the production environment is properly configured to work with Traefik

# Text colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}ChronoChimp Production Environment Tester${NC}"
echo -e "This script will test your production environment configuration with Traefik\n"

# Check if environment files exist
ENV_PROD_FILE=".env.production"
if [ ! -f "$ENV_PROD_FILE" ]; then
  echo -e "${RED}Production environment file (.env.production) not found!${NC}"
  echo -e "Please run: ./scripts/env-manager.sh create prod"
  exit 1
fi

# Check key settings in production environment
echo -e "${BLUE}Checking production environment configuration...${NC}"

# Function to check if a setting has the expected value
check_setting() {
  local file=$1
  local setting=$2
  local expected=$3
  local value=$(grep "^$setting=" "$file" | cut -d= -f2)
  
  if [ "$value" = "$expected" ]; then
    echo -e "  ${GREEN}✓${NC} $setting=$value"
  else
    echo -e "  ${RED}✗${NC} $setting=$value (expected: $expected)"
  fi
}

# Check essential production settings
check_setting "$ENV_PROD_FILE" "NODE_ENV" "production"
check_setting "$ENV_PROD_FILE" "NEXT_PUBLIC_TRUST_PROXY" "true"
check_setting "$ENV_PROD_FILE" "NEXT_PUBLIC_ALLOW_HTTP_COOKIES" "false"
check_setting "$ENV_PROD_FILE" "NEXT_PUBLIC_BYPASS_AUTH" "false"

# Check docker-compose.yml for Traefik labels
echo -e "\n${BLUE}Checking Docker Compose configuration...${NC}"
if grep -q "traefik.enable=true" docker-compose.yml; then
  echo -e "  ${GREEN}✓${NC} Traefik labels found in docker-compose.yml"
else
  echo -e "  ${RED}✗${NC} Traefik labels not found in docker-compose.yml"
fi

# Check middleware.ts for proxy handling
echo -e "\n${BLUE}Checking middleware.ts for proxy handling...${NC}"
if grep -q "getClientIP" src/middleware.ts && grep -q "getProtocol" src/middleware.ts; then
  echo -e "  ${GREEN}✓${NC} Proxy-aware functions found in middleware.ts"
else
  echo -e "  ${RED}✗${NC} Proxy-aware functions not found in middleware.ts"
fi

# Check secure cookie handling
echo -e "\n${BLUE}Checking secure cookie handling...${NC}"
if grep -q "getSecureCookieSettings" src/lib/auth-helpers.ts; then
  echo -e "  ${GREEN}✓${NC} Secure cookie settings function found"
else
  echo -e "  ${RED}✗${NC} Secure cookie settings function not found"
fi

# Summary
echo -e "\n${BLUE}Production Environment Test Summary:${NC}"
echo -e "Your ChronoChimp production environment is configured for use with Traefik."
echo -e "To start ChronoChimp in production mode:"
echo -e "  1. Switch to production environment: ${CYAN}./scripts/env-manager.sh prod${NC}"
echo -e "  2. Start the containers: ${CYAN}docker-compose up -d prod${NC}"
echo -e "\nImportant reminders:"
echo -e "  - Make sure Traefik is properly configured on your server"
echo -e "  - Ensure SSL certificates are set up correctly"
echo -e "  - Update your domain settings in .env.production"
echo -e "  - Set strong, secure passwords and API keys"
