#!/bin/bash
# This script generates a temporary encryption key for the build process
# It will be used only during build and not stored in the final image

# Generate a random key for build time only
temp_key=$(head -c 32 /dev/urandom | base64 | tr -d '\n/')

# Output the key for the build process to use
echo "$temp_key"
