/**
 * ChronoChimp Runtime Policy
 * 
 * Edge Runtime Compatible Operations:
 * - JWT verification (jose library)
 * - Web Crypto API operations (crypto.subtle)
 * - Cookie management (cookies-next)
 * - Basic HTTP handling (request/response)
 * - URL operations (URL API)
 * - Fetch API calls
 * - JSON parsing/stringifying
 * - Basic data validation (zod)
 * 
 * Node.js Runtime Required For:
 * 1. Database Operations:
 *    - All better-sqlite3 operations
 *    - Direct SQL queries
 *    - Database migrations
 * 
 * 2. Security Operations:
 *    - bcrypt password hashing
 *    - crypto.randomUUID() generation
 *    - Sensitive data encryption
 * 
 * 3. File System Operations:
 *    - Reading/writing files (fs)
 *    - Path manipulations (path)
 *    - Directory operations
 * 
 * Route Runtime Requirements:
 * 
 * Must Use Node.js Runtime:
 * - /api/auth/* (except validate-key/edge)
 *   Reason: Uses bcrypt and database
 * 
 * - /api/tasks/*
 *   Reason: Database operations
 * 
 * - /api/admin/*
 *   Reason: Database and sensitive operations
 * 
 * - /api/me/*
 *   Reason: User data and database operations
 * 
 * - /api/db/*
 *   Reason: Direct database access
 * 
 * - /api/internal/*
 *   Reason: Internal database operations
 * 
 * Can Use Edge Runtime:
 * - /api/auth/validate-key/edge
 *   Reason: Only does token verification and forwarding
 * 
 * - Any static file serving
 * - Public API endpoints without DB access
 * - Simple redirects and middleware
 * 
 * Best Practices:
 * 1. Use Node.js runtime by default for API routes
 * 2. Only use Edge runtime when proven safe
 * 3. Keep sensitive operations in Node.js
 * 4. Split routes into Edge/Node.js when needed
 */
