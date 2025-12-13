# WebApp Manus - Complete Setup Guide

This guide explains what is needed for all functions in the system to work properly.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Database Setup](#database-setup)
4. [Installation Steps](#installation-steps)
5. [Running the Application](#running-the-application)
6. [Feature Configuration](#feature-configuration)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- **Node.js**: v18 or higher
- **pnpm**: v10.4.1 or higher (install with `npm install -g pnpm`)
- **MySQL Database**: v8.0 or higher (can use Railway, PlanetScale, or local MySQL)

### Optional Software
- **Docker**: For containerized deployment
- **Railway CLI**: For deployment to Railway

## Environment Variables

Create a `.env` file in the root directory with the following variables:

### Required Variables

```bash
# Database Connection (MySQL - REQUIRED)
DATABASE_URL=mysql://user:password@host:3306/database
# Example: mysql://root:password@localhost:3306/webappmanus

# Authentication (REQUIRED for user login)
VITE_APP_ID=your_manus_app_id
JWT_SECRET=generate_a_secure_random_string_at_least_32_chars
OAUTH_SERVER_URL=https://oauth.manus.app
OWNER_OPEN_ID=your_owner_open_id

# Server Configuration (REQUIRED)
PORT=3000
NODE_ENV=development
```

### Optional Variables

```bash
# OCR Features (OPTIONAL - for PDF text extraction in tenders)
# Option 1: Built-in Forge API
BUILT_IN_FORGE_API_URL=https://your-forge-api-url
BUILT_IN_FORGE_API_KEY=your_forge_api_key

# Option 2: OCR.space (used as fallback before LLM)
OCR_SPACE_API_KEY=your_ocr_space_api_key

# Analytics (OPTIONAL - for usage tracking with Umami)
VITE_ANALYTICS_ENDPOINT=https://your-umami-instance.com
VITE_ANALYTICS_WEBSITE_ID=your_website_id

# File Storage (OPTIONAL - for AWS S3 file uploads)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
```

### Generating JWT_SECRET

Generate a secure JWT secret using one of these methods:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32

# Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

## Database Setup

### 1. Create Database

Create a MySQL database for the application:

```sql
CREATE DATABASE webappmanus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Run Migrations

The application uses Drizzle ORM for database migrations.

```bash
# Generate and run migrations
pnpm run db:push
```

This will:
- Generate migration files from the schema
- Apply all migrations to your database
- Create all necessary tables

### 3. Seed Initial Data (Optional)

Seed budget categories and initial data:

```bash
pnpm run seed
```

## Installation Steps

### 1. Clone Repository

```bash
git clone https://github.com/Mustafabeshara/webappmanus.git
cd webappmanus
```

### 2. Install Dependencies

```bash
pnpm install
```

If you encounter peer dependency issues with npm, use pnpm as specified.

### 3. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your actual values
nano .env  # or use your preferred editor
```

### 4. Setup Database

```bash
# Run migrations
pnpm run db:push

# Seed initial data (optional)
pnpm run seed
```

## Running the Application

### Development Mode

```bash
# Start development server (hot reload enabled)
pnpm run dev
```

The application will be available at `http://localhost:3000`

### Production Mode

```bash
# Build the application
pnpm run build

# Start production server
pnpm run start
```

### Using Docker

#### Development

```bash
# Start development containers
pnpm run docker:dev

# View logs
pnpm run docker:dev:logs

# Stop containers
pnpm run docker:dev:stop
```

#### Production

```bash
# Build and start production containers
pnpm run docker:prod:build

# Stop production containers
pnpm run docker:prod:stop
```

### Using Railway

Railway automatically deploys from the `main` branch when you push to GitHub.

```bash
# Manual deployment (if railway CLI installed)
railway up
```

## Feature Configuration

### Core Features (Always Available)

These features work with just the required environment variables:

1. **Dashboard** - Analytics and overview
2. **Tenders** - CRUD operations for tender management
3. **Budgets** - Budget tracking with categories
4. **Invoices** - Invoice management
5. **Expenses** - Expense tracking
6. **Inventory** - Product and stock management
7. **Suppliers** - Supplier management
8. **Customers** - Customer relationship management
9. **Deliveries** - Delivery tracking
10. **Purchase Orders** - PO management
11. **Tasks** - Task management
12. **Users** - User management
13. **Departments** - Department management
14. **Audit Logs** - Activity tracking
15. **Settings** - System configuration

### Optional Features

#### OCR Document Extraction

**Required for**: Automatic text extraction from PDF tenders

**Setup**: Add one of these to `.env`:

```bash
# Option 1: Forge API (Recommended)
BUILT_IN_FORGE_API_URL=https://your-forge-api-url
BUILT_IN_FORGE_API_KEY=your_api_key

# Option 2: OCR.space (Free tier available)
OCR_SPACE_API_KEY=your_api_key
```

**Features enabled**:
- Automatic PDF text extraction in tenders
- Structured data extraction from documents
- LLM fallback if OCR fails

#### File Storage (S3)

**Required for**: File uploads and document management

**Setup**: Add to `.env`:

```bash
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
```

**Features enabled**:
- Receipt uploads in Expenses
- Document uploads in Tenders
- File attachments in Tasks and Purchase Orders
- File versioning system
- Bulk file operations

**Without S3**: Files are stored temporarily on the server (not recommended for production).

#### Analytics

**Required for**: Usage tracking and analytics

**Setup**: Add to `.env`:

```bash
VITE_ANALYTICS_ENDPOINT=https://your-umami-instance.com
VITE_ANALYTICS_WEBSITE_ID=your_website_id
```

**Features enabled**:
- Page view tracking
- User behavior analytics
- Performance monitoring

## Linting, Building, and Testing

### Linting

```bash
# Check for linting errors
pnpm run lint

# Fix auto-fixable linting errors
pnpm run lint:fix

# Format code with Prettier
pnpm run format
```

### Type Checking

```bash
# Run TypeScript type checking
pnpm run check
```

### Testing

```bash
# Run unit tests
pnpm run test

# Run end-to-end tests
pnpm run test:e2e

# Run all tests
pnpm run test:all
```

### Building

```bash
# Build for production
pnpm run build
```

This creates:
- Frontend bundle in `dist/public/`
- Backend bundle in `dist/index.js`

## Troubleshooting

### Common Issues

#### 1. Database Connection Error

**Error**: `Cannot connect to database`

**Solution**:
- Verify DATABASE_URL is correct
- Ensure MySQL is running
- Check firewall settings
- Test connection: `mysql -h host -u user -p`

#### 2. Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or use a different port
PORT=3001 pnpm run dev
```

#### 3. JWT_SECRET Not Set

**Error**: `JWT_SECRET is required`

**Solution**:
- Generate a secure secret (see [Generating JWT_SECRET](#generating-jwt_secret))
- Add to `.env` file
- Restart the server

#### 4. Migration Errors

**Error**: `Migration failed`

**Solution**:
```bash
# Reset database (WARNING: deletes all data)
pnpm run docker:clean  # if using Docker

# Or manually drop and recreate database
mysql -u user -p -e "DROP DATABASE webappmanus; CREATE DATABASE webappmanus;"

# Re-run migrations
pnpm run db:push
```

#### 5. Peer Dependency Conflicts

**Error**: `ERESOLVE unable to resolve dependency tree`

**Solution**:
- Use pnpm instead of npm: `pnpm install`
- If using npm: `npm install --legacy-peer-deps`

#### 6. OCR Not Working

**Symptoms**: Tender PDF upload succeeds but no text extracted

**Solution**:
- Check OCR API keys are set correctly
- Verify API endpoint is accessible
- Check API quota limits
- Review server logs for OCR errors

#### 7. File Upload Fails

**Symptoms**: File upload returns error

**Solution**:
- Check S3 credentials are correct
- Verify S3 bucket exists and is accessible
- Check S3 bucket CORS configuration
- Ensure file size is under 10MB limit
- Check file type is allowed (.pdf, .jpg, .png, .doc, .docx, .xls, .xlsx)

### Getting Help

If you encounter issues not covered here:

1. Check server logs: `pnpm run docker:dev:logs` (Docker) or console output
2. Check browser console for frontend errors
3. Review [GitHub Issues](https://github.com/Mustafabeshara/webappmanus/issues)
4. Create a new issue with:
   - Error message
   - Steps to reproduce
   - Environment details (OS, Node version, etc.)

## Security Considerations

### Production Deployment

1. **Never commit `.env` file** - It's in `.gitignore` for a reason
2. **Use strong JWT_SECRET** - At least 32 characters, randomly generated
3. **Enable HTTPS** - Use SSL certificates in production
4. **Secure database** - Use strong passwords, limit access
5. **Keep dependencies updated** - Run `pnpm update` regularly
6. **Review security logs** - Monitor audit logs for suspicious activity

### Security Features Included

- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting
- Session management
- Password hashing with bcrypt
- Audit logging
- Security event tracking

## Additional Resources

- **Documentation**: Check `CLAUDE.md` for project context
- **Progress**: See `todo.md` for feature status
- **Security**: Review `SECURITY_IMPLEMENTATION_STATUS.md`
- **Database Schema**: Check `drizzle/schema.ts`
- **API Routes**: See `server/appRouter.ts`

## License

MIT License - See LICENSE file for details
