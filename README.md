# ChronoChimp 🐵⏰

A modern time tracking and productivity application built with Next.js.

## Features

- ⏱️ Time tracking with start/stop functionality
- 📊 Analytics and reporting dashboard
- 🔐 User authentication with API key support
- 💾 Data persistence and synchronization
- 📱 Responsive design for desktop and mobile
- 🌙 Dark/light theme support
- 📈 Productivity insights and metrics

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Prerequisites

- Node.js 18+ 
- npm or yarn

## Installation

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
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable UI components
├── lib/                   # Utility functions and configurations
│   └── utils.ts           # Helper functions
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
└── styles/                # Additional styling files
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

- `NEXT_PUBLIC_TRUST_PROXY` - Set to 'true' when behind a reverse proxy like Traefik
- `NEXT_PUBLIC_ALLOW_HTTP_COOKIES` - Set to 'false' in production to require secure cookies
- `NEXT_PUBLIC_BYPASS_AUTH` - Authentication bypass for development (never use in production)
- `CORS_ALLOWED_ORIGINS` - Comma-separated list of allowed origins for CORS

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

Made with ❤️ by the ChronoChimp team
