# Quick Reference - What You Need to Run All Functions

## ✅ Code Quality Status

- **ESLint**: ✅ 0 errors, 0 warnings
- **TypeScript**: ✅ No compilation errors
- **Tests**: ✅ 149/149 passing
- **Build**: ✅ Successful

## 🔑 Required Environment Variables

To run the core application, you need these variables in your `.env` file:

```bash
# Database Connection
DATABASE_URL=mysql://user:password@host:3306/database

# Authentication
VITE_APP_ID=your_manus_app_id
JWT_SECRET=your_32_char_random_secret
OAUTH_SERVER_URL=https://oauth.manus.app
OWNER_OPEN_ID=your_owner_open_id

# Server
PORT=3000
NODE_ENV=development
```

### Generate JWT_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📦 Core Features (Always Available)

With just the required environment variables, these features work:

| Feature | Description |
|---------|-------------|
| Dashboard | Analytics and overview |
| Tenders | CRUD operations for tenders |
| Budgets | Budget tracking with categories |
| Invoices | Invoice management |
| Expenses | Expense tracking |
| Inventory | Product and stock management |
| Suppliers | Supplier management |
| Customers | Customer relations |
| Deliveries | Delivery tracking |
| Purchase Orders | PO management |
| Tasks | Task management |
| Users | User management |
| Departments | Department management |
| Audit Logs | Activity tracking |
| Settings | System configuration |

## 🔌 Optional Features

### OCR Document Extraction

**Enables**: Automatic PDF text extraction in tenders

**Required Variables**:
```bash
# Option 1: Forge API (Recommended)
BUILT_IN_FORGE_API_URL=https://your-forge-api-url
BUILT_IN_FORGE_API_KEY=your_api_key

# OR Option 2: OCR.space (Free tier available)
OCR_SPACE_API_KEY=your_api_key
```

### File Storage (AWS S3)

**Enables**: 
- Receipt uploads in Expenses
- Document uploads in Tenders
- File attachments in Tasks and POs
- File versioning system

**Required Variables**:
```bash
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
```

### Analytics Tracking

**Enables**: Usage analytics with Umami

**Required Variables**:
```bash
VITE_ANALYTICS_ENDPOINT=https://your-umami-instance.com
VITE_ANALYTICS_WEBSITE_ID=your_website_id
```

## 🚀 Quick Start Commands

```bash
# Install dependencies
pnpm install

# Setup database
pnpm run db:push

# Seed initial data
pnpm run seed

# Start development server
pnpm run dev
```

## 🧪 Quality Checks

```bash
# Lint code
pnpm run lint

# Type check
pnpm run check

# Run tests
pnpm run test

# Build
pnpm run build
```

## 📚 Full Documentation

For detailed setup instructions:
- **[README.md](README.md)** - Project overview and quick start
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Complete setup and troubleshooting

## 🔧 Common Setup Issues

### Issue: "Cannot connect to database"
**Solution**: Check DATABASE_URL is correct and MySQL is running

### Issue: "JWT_SECRET is required"
**Solution**: Generate and add JWT_SECRET to .env file

### Issue: "Port 3000 already in use"
**Solution**: Change PORT in .env or kill process using port 3000

### Issue: "OCR not working"
**Solution**: Add OCR API credentials to .env (optional feature)

### Issue: "File upload fails"
**Solution**: Add AWS S3 credentials to .env (optional feature)

## 📊 Feature Matrix

| Feature | Required Env Vars | Optional Env Vars |
|---------|-------------------|-------------------|
| Login/Auth | JWT_SECRET, VITE_APP_ID, OAUTH_SERVER_URL | - |
| All CRUD Operations | DATABASE_URL | - |
| PDF Text Extraction | - | BUILT_IN_FORGE_API_URL or OCR_SPACE_API_KEY |
| File Uploads | - | AWS S3 credentials |
| Analytics | - | VITE_ANALYTICS_* |

## ✨ Summary

**Minimum to run**: 5 required environment variables
**Full features**: Add optional OCR and S3 credentials
**Current status**: All code quality checks passing ✅
