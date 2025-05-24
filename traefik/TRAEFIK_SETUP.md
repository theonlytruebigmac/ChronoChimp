# Traefik Configuration for ChronoChimp

This document provides instructions for setting up Traefik as a reverse proxy for ChronoChimp in a production environment.

## Files Included

- `traefik-middleware.yaml`: Defines middleware components for security, headers, and rate limiting
- `traefik-config.yaml`: Complete dynamic configuration for Traefik with routers, services, and middleware
- `traefik-docker-compose.yml`: Docker Compose file for running Traefik
- `traefik-static-config.yml`: Static configuration for Traefik

## Setup Instructions

### 1. Prepare Directory Structure

```bash
# Create required directories
mkdir -p traefik/config traefik/data
```

### 2. Set Up Configuration Files

```bash
# Copy the static configuration
cp traefik-static-config.yml traefik/traefik.yml

# Copy the dynamic configuration to the config directory
cp traefik-config.yaml traefik/config/chronochimp.yml
```

### 3. Create Docker Network

```bash
# Create the external network for communication between Traefik and ChronoChimp
docker network create web
```

### 4. Update Domain Names

Edit the configuration files to replace `chronochimp.example.com` with your actual domain name:

- `traefik/config/chronochimp.yml`
- `traefik/traefik.yml` (update the email address)
- `traefik-docker-compose.yml` (update dashboard domain)

### 5. Update Environment Variables

Make sure your ChronoChimp `.env.production` file has these settings:

```
NODE_ENV=production
NEXT_PUBLIC_TRUST_PROXY=true
NEXT_PUBLIC_ALLOW_HTTP_COOKIES=false
BASE_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 6. Update Your `docker-compose.yml`

Ensure your ChronoChimp service in `docker-compose.yml` has these settings:

```yaml
prod:
  container_name: chronochimp_prod
  image: ghcr.io/theonlytruebigmac/chronochimp:main
  restart: unless-stopped
  env_file:
    - .env.production
  networks:
    - web
  volumes:
    - chronotask_data_prod:/app/.data
  labels:
    - "traefik.enable=true"
    - "traefik.docker.network=web"
    # Using middleware chains defined in the configuration
    - "traefik.http.routers.chronochimp.middlewares=chronochimp-secured"
    - "traefik.http.routers.chronochimp-api.middlewares=chronochimp-api"

networks:
  web:
    external: true
```

### 7. Start Traefik

```bash
docker-compose -f traefik-docker-compose.yml up -d
```

### 8. Start ChronoChimp in Production Mode

```bash
# Switch to production environment
./scripts/env-manager.sh prod

# Start ChronoChimp
docker-compose up -d prod
```

## Security Notes

1. **Dashboard Security**: The Traefik dashboard is protected with basic auth. Change the default credentials in `traefik-docker-compose.yml`.

2. **SSL Certificates**: Traefik will automatically request SSL certificates from Let's Encrypt.

3. **Firewall**: Make sure ports 80 and 443 are open on your server.

4. **Headers**: The configuration includes security headers that help protect your application.

## Monitoring

- Traefik dashboard is available at `https://traefik.your-domain.com`
- Logs are stored in `traefik/data/access.log`

## Troubleshooting

1. **Certificate Issues**: Check `traefik/data/acme.json` for Let's Encrypt information.

2. **Connectivity Problems**: 
   - Ensure the `web` network is correctly set up
   - Check that both Traefik and ChronoChimp containers are running
   - Verify domain DNS settings point to your server

3. **Header Problems**: Use browser developer tools to check if X-Forwarded headers are correctly set.
