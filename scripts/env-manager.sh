#!/bin/bash
# ChronoChimp Environment Manager
# This script helps manage development and production environments

# Text colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# File paths
PROJECT_ROOT=$(pwd)
DEV_ENV="$PROJECT_ROOT/.env.development"
PROD_ENV="$PROJECT_ROOT/.env.production"
LOCAL_ENV="$PROJECT_ROOT/.env.local"

# Function to show help
show_help() {
  echo -e "${BLUE}ChronoChimp Environment Manager${NC}"
  echo -e "Usage: $0 [command]"
  echo -e "\nCommands:"
  echo -e "  ${CYAN}dev${NC}         - Switch to development environment"
  echo -e "  ${CYAN}prod${NC}        - Switch to production environment"
  echo -e "  ${CYAN}status${NC}      - Show current environment status"
  echo -e "  ${CYAN}edit dev${NC}    - Edit development environment variables"
  echo -e "  ${CYAN}edit prod${NC}   - Edit production environment variables"
  echo -e "  ${CYAN}create dev${NC}  - Create development environment from example"
  echo -e "  ${CYAN}create prod${NC} - Create production environment from example"
  echo -e "  ${CYAN}help${NC}        - Show this help message"
}

# Function to show status
show_status() {
  echo -e "${BLUE}Environment Status:${NC}"
  
  if [ -f "$LOCAL_ENV" ]; then
    # Check if the current environment is development or production
    if grep -q "NODE_ENV=development" "$LOCAL_ENV"; then
      echo -e "Current environment: ${GREEN}Development${NC}"
    elif grep -q "NODE_ENV=production" "$LOCAL_ENV"; then
      echo -e "Current environment: ${GREEN}Production${NC}"
    else
      echo -e "Current environment: ${YELLOW}Custom/Unknown${NC}"
    fi
  else
    echo -e "Current environment: ${YELLOW}Not set (no .env.local file)${NC}"
  fi
  
  # Check if environment files exist
  echo -e "\nEnvironment files:"
  if [ -f "$DEV_ENV" ]; then
    echo -e "  Development (.env.development): ${GREEN}Exists${NC}"
  else
    echo -e "  Development (.env.development): ${RED}Missing${NC}"
  fi
  
  if [ -f "$PROD_ENV" ]; then
    echo -e "  Production (.env.production): ${GREEN}Exists${NC}"
  else
    echo -e "  Production (.env.production): ${RED}Missing${NC}"
  fi
  
  if [ -f "$LOCAL_ENV" ]; then
    echo -e "  Local (.env.local): ${GREEN}Exists${NC}"
  else
    echo -e "  Local (.env.local): ${RED}Missing${NC}"
  fi
  
  # Show what values are set in each env (just keys, not values for security)
  if [ -f "$DEV_ENV" ]; then
    echo -e "\nDevelopment environment variables:"
    grep -v "^#" "$DEV_ENV" | grep "=" | cut -d= -f1 | sort | sed 's/^/  /'
  fi
  
  if [ -f "$PROD_ENV" ]; then
    echo -e "\nProduction environment variables:"
    grep -v "^#" "$PROD_ENV" | grep "=" | cut -d= -f1 | sort | sed 's/^/  /'
  fi
}

# Function to switch to development environment
switch_to_dev() {
  if [ ! -f "$DEV_ENV" ]; then
    echo -e "${RED}Development environment file (.env.development) not found!${NC}"
    echo -e "Create it first with: $0 create dev"
    return 1
  fi
  
  # Copy development environment to local
  cp "$DEV_ENV" "$LOCAL_ENV"
  echo -e "${GREEN}Switched to development environment.${NC}"
  
  # Show what settings are now active
  echo -e "\nActive environment variables:"
  grep -v "^#" "$LOCAL_ENV" | grep "=" | sort
}

# Function to switch to production environment
switch_to_prod() {
  if [ ! -f "$PROD_ENV" ]; then
    echo -e "${RED}Production environment file (.env.production) not found!${NC}"
    echo -e "Create it first with: $0 create prod"
    return 1
  fi
  
  echo -e "${YELLOW}WARNING: You are switching to production environment!${NC}"
  echo -e "This may change behavior and database connections."
  read -p "Are you sure you want to continue? (y/n): " choice
  
  if [[ "$choice" != "y" && "$choice" != "Y" ]]; then
    echo -e "${YELLOW}Operation cancelled.${NC}"
    return 0
  fi
  
  # Copy production environment to local
  cp "$PROD_ENV" "$LOCAL_ENV"
  echo -e "${GREEN}Switched to production environment.${NC}"
  
  # Show what settings are now active
  echo -e "\nActive environment variables:"
  grep -v "^#" "$LOCAL_ENV" | grep "=" | sort
}

# Function to edit environment file
edit_env() {
  local env_file=""
  
  if [ "$1" == "dev" ]; then
    env_file="$DEV_ENV"
    echo -e "${BLUE}Editing development environment...${NC}"
  elif [ "$1" == "prod" ]; then
    env_file="$PROD_ENV"
    echo -e "${BLUE}Editing production environment...${NC}"
  else
    echo -e "${RED}Invalid environment specified. Use 'dev' or 'prod'.${NC}"
    return 1
  fi
  
  if [ ! -f "$env_file" ]; then
    echo -e "${RED}Environment file not found: $env_file${NC}"
    echo -e "Create it first with: $0 create $1"
    return 1
  fi
  
  # Open in editor based on what's available
  if [ -n "$EDITOR" ]; then
    $EDITOR "$env_file"
  elif command -v nano &> /dev/null; then
    nano "$env_file"
  elif command -v vim &> /dev/null; then
    vim "$env_file"
  else
    echo -e "${RED}No editor found. Install nano or vim, or set the EDITOR environment variable.${NC}"
    return 1
  fi
}

# Function to create environment file from example
create_env() {
  local env_file=""
  local example_file="$PROJECT_ROOT/.env.example"
  
  if [ "$1" == "dev" ]; then
    env_file="$DEV_ENV"
    echo -e "${BLUE}Creating development environment...${NC}"
  elif [ "$1" == "prod" ]; then
    env_file="$PROD_ENV"
    echo -e "${BLUE}Creating production environment...${NC}"
  else
    echo -e "${RED}Invalid environment specified. Use 'dev' or 'prod'.${NC}"
    return 1
  fi
  
  if [ ! -f "$example_file" ]; then
    echo -e "${RED}Example environment file not found: $example_file${NC}"
    return 1
  fi
  
  if [ -f "$env_file" ]; then
    echo -e "${YELLOW}Environment file already exists: $env_file${NC}"
    read -p "Overwrite it? (y/n): " choice
    
    if [[ "$choice" != "y" && "$choice" != "Y" ]]; then
      echo -e "${YELLOW}Operation cancelled.${NC}"
      return 0
    fi
  fi
  
  # Copy example file to the target environment file
  cp "$example_file" "$env_file"
  
  # Default values for development environment
  if [ "$1" == "dev" ]; then
    # Set development-specific values
    sed -i "s/^NODE_ENV=.*/NODE_ENV=development/" "$env_file"
    sed -i "s/^NEXT_PUBLIC_ALLOW_HTTP_COOKIES=.*/NEXT_PUBLIC_ALLOW_HTTP_COOKIES=true/" "$env_file"
    sed -i "s/^NEXT_PUBLIC_TRUST_PROXY=.*/NEXT_PUBLIC_TRUST_PROXY=false/" "$env_file"
    sed -i "s/^PORT=.*/PORT=9004/" "$env_file"
    sed -i "s#^BASE_URL=.*#BASE_URL=http://localhost:9004#" "$env_file"
    sed -i "s#^NEXT_PUBLIC_APP_URL=.*#NEXT_PUBLIC_APP_URL=http://localhost:9004#" "$env_file"
  fi
  
  # Default values for production environment
  if [ "$1" == "prod" ]; then
    # Set production-specific values
    sed -i "s/^NODE_ENV=.*/NODE_ENV=production/" "$env_file"
    sed -i "s/^NEXT_PUBLIC_ALLOW_HTTP_COOKIES=.*/NEXT_PUBLIC_ALLOW_HTTP_COOKIES=false/" "$env_file"
    sed -i "s/^NEXT_PUBLIC_TRUST_PROXY=.*/NEXT_PUBLIC_TRUST_PROXY=true/" "$env_file"
    sed -i "s/^PORT=.*/PORT=3000/" "$env_file"
  fi
  
  echo -e "${GREEN}Environment file created: $env_file${NC}"
  echo -e "Edit it with: $0 edit $1"
}

# Process command
case "$1" in
  "dev")
    switch_to_dev
    ;;
  "prod")
    switch_to_prod
    ;;
  "status")
    show_status
    ;;
  "edit")
    if [ -z "$2" ]; then
      echo -e "${RED}Please specify which environment to edit (dev/prod).${NC}"
      show_help
      exit 1
    fi
    edit_env "$2"
    ;;
  "create")
    if [ -z "$2" ]; then
      echo -e "${RED}Please specify which environment to create (dev/prod).${NC}"
      show_help
      exit 1
    fi
    create_env "$2"
    ;;
  "help"|"")
    show_help
    ;;
  *)
    echo -e "${RED}Unknown command: $1${NC}"
    show_help
    exit 1
    ;;
esac
