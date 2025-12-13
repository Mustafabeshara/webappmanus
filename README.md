# WebApp Manus - Business Management System

A comprehensive business management system for tender tracking, budgets, invoices, expenses, and inventory management. Built for Beshara Group Healthcare Solutions Division.

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Tests](https://img.shields.io/badge/tests-149%20passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

## 🚀 Features

### Core Modules
- **Dashboard** - Real-time analytics and business insights
- **Tender Management** - Complete tender lifecycle with OCR extraction
- **Budget Tracking** - Multi-category budget management with approval workflows
- **Invoice Management** - Invoice creation, tracking, and payment management
- **Expense Tracking** - Expense management with receipt uploads
- **Inventory Management** - Product tracking with stock alerts and batch monitoring
- **Supplier Management** - Supplier database with performance tracking
- **Customer Relations** - CRM features for hospital and healthcare customers
- **Purchase Orders** - PO creation and tracking
- **Deliveries** - Shipment tracking and proof-of-delivery
- **Task Management** - Collaborative task tracking with assignments
- **Document Management** - Centralized file storage with versioning
- **Audit Logs** - Complete activity tracking for compliance
- **User Management** - Role-based access control
- **Notifications** - Real-time alerts with sound notifications

### Advanced Features
- 🤖 **AI Business Insights** - Intelligent analytics and forecasting
- 📄 **OCR Document Processing** - Automatic text extraction from PDFs
- 📊 **Data Export** - Export to Excel, PDF, and CSV
- 🔒 **Security** - Comprehensive security with CSRF, XSS protection, and audit logging
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🎨 **Modern UI** - Built with shadcn/ui and Tailwind CSS
- ⚡ **Type-Safe API** - Full type safety with tRPC
- 🔄 **Real-Time Updates** - Live notifications and polling

## 🛠️ Tech Stack

### Frontend
- **React 19** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - High-quality component library
- **TanStack Query** - Powerful data fetching
- **Wouter** - Lightweight routing
- **Recharts** - Data visualization

### Backend
- **Express.js** - Web server framework
- **tRPC** - End-to-end type-safe APIs
- **Drizzle ORM** - Type-safe database ORM
- **MySQL** - Relational database
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Vitest** - Unit testing
- **Playwright** - End-to-end testing
- **Docker** - Containerization
- **pnpm** - Fast package manager

## 📋 Prerequisites

- Node.js v18 or higher
- pnpm v10.4.1 or higher
- MySQL v8.0 or higher

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Mustafabeshara/webappmanus.git
cd webappmanus
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

**Required environment variables:**
```env
DATABASE_URL=mysql://user:password@host:3306/database
VITE_APP_ID=your_manus_app_id
JWT_SECRET=your_32_char_secret
OAUTH_SERVER_URL=https://oauth.manus.app
OWNER_OPEN_ID=your_owner_open_id
PORT=3000
NODE_ENV=development
```

### 4. Setup Database

```bash
# Run migrations
pnpm run db:push

# Seed initial data (optional)
pnpm run seed
```

### 5. Start Development Server

```bash
pnpm run dev
```

Visit `http://localhost:3000` to see the application.

## 📖 Documentation

For detailed setup instructions, configuration options, and troubleshooting:

👉 **[Complete Setup Guide](SETUP_GUIDE.md)**

## 🏗️ Project Structure

```
webappmanus/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   └── ui/         # shadcn/ui base components
│   │   ├── pages/          # Route pages
│   │   ├── lib/            # Utilities (tRPC client, utils)
│   │   └── hooks/          # Custom React hooks
├── server/                 # Express backend
│   ├── _core/              # Core server infrastructure
│   ├── routers/            # tRPC routers (API endpoints)
│   ├── db/                 # Database utilities
│   ├── ocr/                # PDF text extraction
│   └── types/              # TypeScript type definitions
├── drizzle/                # Database schema and migrations
│   ├── schema.ts           # Database schema
│   └── *.sql               # Migration files
├── shared/                 # Shared types between client/server
└── e2e/                    # End-to-end tests
```

## 🧪 Testing

```bash
# Run unit tests
pnpm run test

# Run end-to-end tests
pnpm run test:e2e

# Run all tests
pnpm run test:all

# Run with UI
pnpm run test:e2e:ui
```

**Current Status:** ✅ 149 tests passing

## 🔍 Code Quality

```bash
# Lint code
pnpm run lint

# Fix linting issues
pnpm run lint:fix

# Format code
pnpm run format

# Type check
pnpm run check
```

## 🐳 Docker Deployment

### Development

```bash
# Start containers
pnpm run docker:dev

# View logs
pnpm run docker:dev:logs

# Stop containers
pnpm run docker:dev:stop
```

### Production

```bash
# Build and start
pnpm run docker:prod:build

# Stop containers
pnpm run docker:prod:stop
```

## 🚢 Production Deployment

### Build for Production

```bash
pnpm run build
```

### Start Production Server

```bash
pnpm run start
```

### Railway Deployment

This project is configured for automatic deployment to Railway:

1. Push to `main` branch
2. Railway automatically builds and deploys
3. Environment variables are managed in Railway dashboard

## 🔒 Security Features

- ✅ SQL Injection Prevention
- ✅ XSS Protection
- ✅ CSRF Protection
- ✅ Rate Limiting
- ✅ Input Validation & Sanitization
- ✅ Password Hashing (bcrypt)
- ✅ Session Management
- ✅ Audit Logging
- ✅ Security Event Tracking
- ✅ File Upload Validation

## 📦 Key Dependencies

| Package | Purpose |
|---------|---------|
| React 19 | UI framework |
| TypeScript | Type safety |
| tRPC | Type-safe APIs |
| Drizzle ORM | Database ORM |
| Tailwind CSS | Styling |
| shadcn/ui | Component library |
| Express | Web server |
| JWT | Authentication |
| Zod | Schema validation |
| Vitest | Testing |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Write tests for new features
- Update documentation as needed
- Run `pnpm run lint` before committing
- Ensure all tests pass

## 🐛 Bug Reports

Found a bug? Please open an issue with:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Environment details

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## 👥 Authors

- **Mustafa Beshara** - Initial work - [@Mustafabeshara](https://github.com/Mustafabeshara)

## 🙏 Acknowledgments

- Built for Beshara Group Healthcare Solutions Division
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)

## 📞 Support

For support and questions:
- 📧 Email: support@besharagroup.com
- 🐛 Issues: [GitHub Issues](https://github.com/Mustafabeshara/webappmanus/issues)
- 📖 Documentation: [Setup Guide](SETUP_GUIDE.md)

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Multi-language support (i18n)
- [ ] Advanced reporting dashboard
- [ ] Integration with accounting software
- [ ] API webhooks
- [ ] Custom workflow builder

---

**Built with ❤️ for healthcare management**
