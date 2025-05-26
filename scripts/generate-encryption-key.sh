#!/bin/bash
# Generate a secure random encryption key for production
# This script creates a new secure random 32-byte key for AES-256 encryption

# Generate a 32-byte (256-bit) random key using OpenSSL
ENCRYPTION_KEY=$(openssl rand -hex 16)

echo "Generated encryption key:"
echo $ENCRYPTION_KEY
echo
echo "Add this to your environment variables (such as .env.local):"
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo
echo "For production environments, add this to your hosting platform's environment variables."
