#!/bin/bash
# Setup Traefik for ChronoChimp

# Text colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}ChronoChimp Traefik Setup Helper${NC}"
echo -e "This script will help you set up Traefik for ChronoChimp\n"

# Check if running as root (needed for some operations)
if [ "$EUID" -ne 0 ]; then
  echo -e "${YELLOW}Warning: Some operations may require root privileges.${NC}"
  echo -e "Consider running with sudo if you encounter permission issues.\n"
fi

# Ask for domain name
read -p "Enter your domain name (e.g., chronochimp.example.com): " DOMAIN_NAME
if [ -z "$DOMAIN_NAME" ]; then
  echo -e "${RED}Error: Domain name is required.${NC}"
  exit 1
fi

# Ask for admin email (for Let's Encrypt)
read -p "Enter your email address (for Let's Encrypt notifications): " ADMIN_EMAIL
if [ -z "$ADMIN_EMAIL" ]; then
  echo -e "${RED}Error: Email address is required.${NC}"
  exit 1
fi

# Create directory structure
echo -e "\n${CYAN}Creating directory structure...${NC}"
mkdir -p traefik/config traefik/data
chmod 600 traefik/data  # Secure permissions for sensitive files

# Create admin password for Traefik dashboard
echo -e "\n${CYAN}Setting up Traefik dashboard credentials...${NC}"
echo -e "${YELLOW}Creating a password for the Traefik dashboard login.${NC}"
echo -e "You'll use this to access the Traefik dashboard at https://traefik.${DOMAIN_NAME}\n"

read -p "Enter username for Traefik dashboard [admin]: " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}

# Generate password securely
if command -v htpasswd &> /dev/null; then
  # Use htpasswd if available
  read -s -p "Enter password for Traefik dashboard: " ADMIN_PASSWORD
  echo
  HASHED_PASSWORD=$(htpasswd -nB ${ADMIN_USER} <<< "${ADMIN_PASSWORD}")
else
  # Fallback to manual password generation
  read -s -p "Enter password for Traefik dashboard: " ADMIN_PASSWORD
  echo
  echo -e "${YELLOW}htpasswd not found. Using less secure password hashing method.${NC}"
  # This is a simple MD5 hash - for production, install apache2-utils for better hashing
  SALT=$(openssl rand -base64 3)
  HASHED_PASSWORD="${ADMIN_USER}:$(openssl passwd -apr1 ${ADMIN_PASSWORD})"
fi

# Replace placeholders in configuration files
echo -e "\n${CYAN}Configuring Traefik for domain: ${DOMAIN_NAME}${NC}"

# Copy configuration files to their destinations
cp traefik-static-config.yml traefik/traefik.yml
cp traefik-config.yaml traefik/config/chronochimp.yml

# Update domain name and email in configurations
sed -i "s/chronochimp.example.com/${DOMAIN_NAME}/g" traefik/config/chronochimp.yml
sed -i "s/admin@chronochimp.example.com/${ADMIN_EMAIL}/g" traefik/traefik.yml
sed -i "s/traefik.chronochimp.example.com/traefik.${DOMAIN_NAME}/g" traefik-docker-compose.yml

# Update admin credentials in docker-compose
# Escape special characters in the hashed password
ESCAPED_PASSWORD=$(echo "${HASHED_PASSWORD}" | sed 's/[\/&]/\\&/g')
sed -i "s/admin:\$apr1\$8EVqITqp\$J3HFIv5LnQTA2hTAfYlJf0/${ESCAPED_PASSWORD}/g" traefik-docker-compose.yml

# Create Docker network if it doesn't exist
echo -e "\n${CYAN}Setting up Docker network...${NC}"
if ! docker network ls | grep -q "web"; then
  docker network create web
  echo -e "${GREEN}Created Docker network 'web'.${NC}"
else
  echo -e "${GREEN}Docker network 'web' already exists.${NC}"
fi

# Update ChronoChimp's production environment
echo -e "\n${CYAN}Updating ChronoChimp production environment...${NC}"
if [ -f ".env.production" ]; then
  sed -i "s#BASE_URL=.*#BASE_URL=https://${DOMAIN_NAME}#" .env.production
  sed -i "s#NEXT_PUBLIC_APP_URL=.*#NEXT_PUBLIC_APP_URL=https://${DOMAIN_NAME}#" .env.production
  sed -i "s#CORS_ALLOWED_ORIGINS=.*#CORS_ALLOWED_ORIGINS=https://${DOMAIN_NAME}#" .env.production
  sed -i "s/NEXT_PUBLIC_TRUST_PROXY=.*/NEXT_PUBLIC_TRUST_PROXY=true/" .env.production
  sed -i "s/NEXT_PUBLIC_ALLOW_HTTP_COOKIES=.*/NEXT_PUBLIC_ALLOW_HTTP_COOKIES=false/" .env.production
  echo -e "${GREEN}Updated .env.production with your domain settings.${NC}"
else
  echo -e "${YELLOW}Warning: .env.production not found. Create it with:${NC}"
  echo -e "  ./scripts/env-manager.sh create prod"
fi

# Finish
echo -e "\n${GREEN}Traefik configuration completed!${NC}"
echo -e "\nNext steps:"
echo -e "1. Start Traefik:"
echo -e "   ${CYAN}docker-compose -f traefik-docker-compose.yml up -d${NC}"
echo -e "2. Switch to production environment:"
echo -e "   ${CYAN}./scripts/env-manager.sh prod${NC}"
echo -e "3. Start ChronoChimp in production mode:"
echo -e "   ${CYAN}docker-compose up -d prod${NC}"
echo -e "\nDashboard will be available at: ${CYAN}https://traefik.${DOMAIN_NAME}${NC}"
echo -e "ChronoChimp will be available at: ${CYAN}https://${DOMAIN_NAME}${NC}"
echo -e "\nFor more information, see the ${CYAN}TRAEFIK_SETUP.md${NC} file."
