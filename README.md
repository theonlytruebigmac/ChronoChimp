# ChronoChimp 🐵⏰

A modern, secure time tracking and productivity application built with Next.js 14, featuring real-time synchronization, advanced authentication, and comprehensive analytics.

## 🌟 Key Features

### Time Tracking & Productivity
- ⏱️ Real-time time tracking with start/stop functionality
- 📊 Detailed analytics dashboard with productivity metrics
- 🏷️ Task categorization and tagging system
- 📈 Visual reporting with customizable charts
- 📝 Time log editing and annotations
- 🎯 Project-based time tracking
- ⚡ Quick task switching

### Security & Authentication
- 🔐 Multi-factor authentication (2FA) with TOTP
- 🔒 AES-256-GCM encrypted secrets
- 🗝️ API key management for programmatic access
- 🔑 JWT-based session management
- 💪 Role-based access control (Admin, Editor, Viewer)
- 🔄 Secure password reset flow
- 📧 Email verification system

### User Experience
- 🌓 Dark/light theme with system preference sync
- 📱 Responsive design for all devices
- ⚡ Client-side rendering with Next.js
- 🔄 Real-time data synchronization
- 🌐 Progressive Web App (PWA) support
- ⌨️ Keyboard shortcuts for power users
- 🔔 Customizable notifications

### Developer Features
- 🛠️ RESTful API with OpenAPI/Swagger docs
- 🔑 API key authentication support
- 📚 Comprehensive API documentation
- 🧪 Testing utilities and scripts
- 🔄 Database migration tools
- 🛡️ Security key rotation support
- 📊 Monitoring and logging

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14, React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **State Management**: React Query
- **Forms**: React Hook Form, Zod
- **Icons**: Lucide Icons

### Backend
- **Runtime**: Node.js 18+
- **Database**: SQLite with better-sqlite3
- **Authentication**: JWT, TOTP (2FA)
- **Encryption**: AES-256-GCM
- **API**: REST with OpenAPI/Swagger

### DevOps & Tooling
- **Container**: Docker
- **Proxy**: Traefik
- **CI/CD**: Vercel deployment
- **Testing**: Jest
- **Documentation**: OpenAPI/Swagger
- **Environment**: dotenv, custom env manager

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm 8+ or yarn
- Docker & Docker Compose (optional)

1. Clone the repository:
```bash
git clone <repository-url>
cd chronochimp
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```bash
# Copy example environment file
cp .env.example .env.development

# Edit the development environment file
nano .env.development

# Switch to development environment
./scripts/env-manager.sh dev
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Authentication

ChronoChimp supports two authentication methods:

### 1. Session-based Authentication (for browsers)
- Uses JWT tokens stored in cookies
- Automatically handles login/logout
- Ideal for web application usage

### 2. API Key Authentication (for programmatic access)
- Generate API keys in the Settings menu
- Include in API requests with Authorization header
- Format: `Authorization: Bearer YOUR_API_KEY`
- Ideal for integrations and automation

Example API request with an API key:
```bash
curl -X GET "https://your-app-url.com/api/tasks" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

You can use the included test script to verify API authentication:
```bash
# First, add your API key to the script
nano scripts/test-api-auth.sh

# Then run it
./scripts/test-api-auth.sh
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable UI components
├── lib/                   # Utility functions and configurations
│   └── utils.ts           # Helper functions
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
└── styles/                # Additional styling files
│   ├── globals.css        # Global styles

```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler

## Environment Configuration

ChronoChimp supports separate configuration environments for development and production:

### Environment Files

- `.env.example` - Template with all available configuration options
- `.env.development` - Configuration for local development
- `.env.production` - Configuration for production deployment
- `.env.local` - Active environment (copied from either development or production)

### Environment Manager Script

ChronoChimp includes a helpful script for managing environment configurations at `scripts/env-manager.sh`:

```bash
# Switch to development environment
./scripts/env-manager.sh dev

# Switch to production environment
./scripts/env-manager.sh prod

# Show current environment status
./scripts/env-manager.sh status

# Edit development environment
./scripts/env-manager.sh edit dev

# Edit production environment
./scripts/env-manager.sh edit prod

# Create development environment from example
./scripts/env-manager.sh create dev

# Create production environment from example
./scripts/env-manager.sh create prod
```

### Production with Traefik

When deploying to production behind a Traefik reverse proxy:

1. Create a production environment:
   ```bash
   ./scripts/env-manager.sh create prod
   ```

2. Edit production settings:
   ```bash
   ./scripts/env-manager.sh edit prod
   ```

3. Ensure these settings are configured properly:
   ```
   NODE_ENV=production
   NEXT_PUBLIC_TRUST_PROXY=true
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   ```

4. The docker-compose.yml file includes Traefik labels for automatic configuration

5. Test your production environment setup:
   ```bash
   ./scripts/test-production-env.sh
   ```

6. Switch to production mode and start the server:
   ```bash
   ./scripts/env-manager.sh prod
   docker-compose up -d prod
   ```

### Key Environment Variables

General Configuration:
- `NODE_ENV` - Set to 'production' in production environments
- `NEXT_PUBLIC_TRUST_PROXY` - Set to 'true' when behind a reverse proxy like Traefik
- `NEXT_PUBLIC_ALLOW_HTTP_COOKIES` - Set to 'false' in production to require secure cookies
- `NEXT_PUBLIC_APP_URL` - The public URL of your application
- `CORS_ALLOWED_ORIGINS` - Comma-separated list of allowed origins for CORS

Security Configuration:
- `ENCRYPTION_KEY` - 32-character key for encrypting 2FA secrets (required)
- `OLD_ENCRYPTION_KEY` - Previous encryption key (only during key rotation)
- `JWT_SECRET` - Secret for signing JWT tokens
- `COOKIE_SECRET` - Secret for signing cookies
- `API_KEY_SECRET` - Secret for API key generation

Development Configuration:
- `NEXT_PUBLIC_BYPASS_AUTH` - Authentication bypass for development (never in production)
- `DEBUG` - Enable debug logging (e.g., 'auth:*,2fa:*')
- `LOG_LEVEL` - Set logging verbosity

## Security

ChronoChimp implements several security features to protect user data:

### Two-Factor Authentication (2FA)

- 🔐 Time-based one-time passwords (TOTP) with apps like Google Authenticator
- 🔒 2FA secrets are encrypted in the database using AES-256-GCM with the following features:
  - Secure key derivation
  - Unique IVs for each encryption operation
  - Authentication tags to prevent tampering
- 🔑 Recovery codes for account access if authenticator app is lost
- 🛡️ Backup codes are hashed for maximum security
- 🔄 Support for encryption key rotation without service interruption
- 🔍 Automated verification tools for 2FA secret integrity

### Data Protection

- 🔒 Passwords are hashed using bcrypt with appropriate work factors
- 🔐 API keys are securely generated and stored
- 🛡️ Session tokens are signed with JWT and include security features:
  - Limited lifetime
  - Secure signature verification
  - Protection against common JWT attacks
- 🔑 Environment variables for storing sensitive configuration
- 🛠️ Automated security maintenance tools
- 📊 Security audit logging for all sensitive operations

### Encryption Configuration

To configure encryption for production:

```bash
# Generate a secure random encryption key (run the provided script)
./scripts/generate-encryption-key.sh

# Add the generated key to your environment variables
ENCRYPTION_KEY=your-secure-random-32-char-key-here

# Optional: Configure old key for rotation
OLD_ENCRYPTION_KEY=your-previous-key-here  # Only needed during key rotation
```

### 2FA Management Scripts

The following scripts help manage and maintain 2FA security:

1. Encrypt existing 2FA secrets:
```bash
# Encrypt any unencrypted 2FA secrets in the database
node scripts/encrypt-2fa-secrets.js
```

2. Verify 2FA secret integrity:
```bash
# Check all 2FA secrets for encryption and validity
node scripts/verify-2fa-secrets.js
```

3. Key rotation:
```bash
# Re-encrypt all secrets with a new key
OLD_ENCRYPTION_KEY=your-old-key ENCRYPTION_KEY=your-new-key node scripts/reencrypt-2fa-secrets.js
```

4. Test 2FA encryption:
```bash
# Validate encryption/decryption functionality
node scripts/test-2fa-encryption.js
```

### 2FA Troubleshooting

If users experience issues with 2FA:

1. Verify secret integrity:
   ```bash
   node scripts/verify-2fa-secrets.js
   ```
   This will identify any problematic 2FA secrets.

2. Check encryption configuration:
   - Ensure ENCRYPTION_KEY is set and is exactly 32 characters
   - During key rotation, verify OLD_ENCRYPTION_KEY is set
   - Validate both keys are base64-encoded
   - Check for proper environment variable loading

3. Common issues and solutions:
   - Invalid 2FA codes: Check time synchronization between server and client
   - Decryption failures: Verify encryption key configuration
   - Migration errors: Run verification script and check logs
   - Recovery code issues: Ensure codes are properly hashed

4. Maintenance best practices:
   - Regularly run verification scripts
   - Monitor failed 2FA attempts
   - Rotate encryption keys periodically
   - Keep backup keys secure

## Development Guidelines

### Code Style
- Use TypeScript for all new files
- Follow ESLint and Prettier configurations
- Use meaningful component and variable names
- Write JSDoc comments for complex functions

### Git Workflow
1. Create feature branches from `main`
2. Make small, focused commits
3. Write descriptive commit messages
4. Open pull requests for review

### Testing
```bash
npm run test          # Run unit tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

## Deployment

### Vercel (Recommended)
1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you have any questions or need help, please:
- Check the [Issues](../../issues) page
- Create a new issue if needed
- Contact the development team

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)

---

Made with ❤️ by the ChimpSec team
