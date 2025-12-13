                                                                                # WebApp Manus - AI Agent Context

## Project Overview
Business management system for tender tracking, budgets, invoices, expenses, and inventory. Built for Beshara Group Healthcare Solutions Division.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Express.js + tRPC
- **Database**: MySQL with Drizzle ORM
- **Deployment**: Railway (auto-deploys from GitHub main branch)

## Directory Structure
```
webappmanus/
├── ient/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   └── ui/         # shadcn/ui base components
│   │   ├── pages/          # Route pages
│   │   ├── lib/            # Utilities (trpc ient, utils)
│   │   └── hooks/          # Custom React hooks
├── server/                 # Express backend
│   ├── routes/             # tRPC routers
│   ├── db/                 # Drizzle schema and migrations
│   └── ocr/                # PDF text extraction
├── shared/                 # Shared types between ient/server
└── db/                     # Database configuration
```

## Key Conventions
- Use semantic color tokens (--primary, --muted-foreground) not hardcoded colors
- Components use rounded-lg/xl for consistency
- tRPC for type-safe API calls
- All forms use react-hook-form + zod validation

## Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `railway up` - Deploy to Railway (usually auto-deploys from git push)

## Current Features
- Dashboard with analytics
- Tender management (CRUD, PDF upload, OCR extraction)
- Budget tracking with categories
- Invoice management
- Expense tracking
- Inventory management
- Notifications system
- AI Business Insights

## Design System
Uses unified design tokens:
- Consistent spacing: p-6, gap-1.5, gap-2
- Border radius: rounded-lg (inputs), rounded-xl (cards, icons)
- Typography: text-sm base, font-medium for labels
- Colors: semantic tokens from CSS variables
