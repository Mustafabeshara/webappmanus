# GitHub Copilot Instructions for WebApp Manus

## Project Overview

WebApp Manus is a comprehensive business management system for tender tracking, budgets, invoices, expenses, and inventory management. Built for Beshara Group Healthcare Solutions Division to manage healthcare-related business operations.

**Key Purpose**: Streamline business operations including tender management, financial tracking, supplier/customer relations, and inventory control for healthcare solutions.

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **tRPC React Query** for type-safe API calls
- **Wouter** for routing
- **React Hook Form** + **Zod** for form validation
- **Recharts** for data visualization

### Backend
- **Express.js** web server
- **tRPC** for type-safe APIs
- **Drizzle ORM** with MySQL database
- **JWT** for authentication
- **bcrypt** for password hashing

### Development & Testing
- **pnpm** as package manager (NOT npm or yarn)
- **Vitest** for unit testing (149+ tests)
- **Playwright** for E2E testing
- **ESLint** for linting
- **Prettier** for formatting
- **TypeScript** strict mode

### Deployment
- **Railway** (auto-deploys from main branch)
- **Docker** support for containerized deployment

## Project Structure

```
webappmanus/
├── client/                      # React frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   └── ui/             # shadcn/ui base components (DO NOT modify directly)
│   │   ├── pages/              # Route pages (one per feature)
│   │   ├── lib/                # Utilities (trpc client, cn utils)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── contexts/           # React Context providers
│   │   └── _core/              # Core frontend utilities
├── server/                      # Express backend
│   ├── _core/                  # Core server infrastructure
│   │   ├── trpc.ts             # tRPC setup with procedures
│   │   ├── auth-middleware.ts  # Authentication logic
│   │   ├── input-validation.ts # Input sanitization & validation
│   │   ├── csrf-protection.ts  # CSRF token handling
│   │   ├── rate-limiting.ts    # Rate limiting
│   │   └── security*.ts        # Security utilities
│   ├── routers/                # tRPC routers (API endpoints)
│   ├── db/                     # Database operations
│   ├── ai/                     # AI integration features
│   ├── ocr/                    # PDF text extraction
│   └── types/                  # TypeScript type definitions
├── drizzle/                     # Database schema & migrations
│   ├── schema.ts               # Drizzle ORM schema
│   └── relations.ts            # Database relations
├── shared/                      # Shared types between client/server
├── e2e/                        # Playwright E2E tests
└── scripts/                    # Build & deployment scripts
```

## Key Conventions & Patterns

### Package Manager
**ALWAYS use pnpm**, never npm or yarn:
```bash
pnpm install <package>
pnpm run dev
pnpm run build
pnpm run test
```

### Import Style
- Combine type imports with value imports using inline `type` syntax:
```typescript
import { Icon, type LucideIcon } from "lucide-react"
import { useState, type ReactNode } from "react"
```

### tRPC Patterns
- **Backend**: Define routers in `server/routers/*.router.ts`
- Use `protectedProcedure` for authenticated endpoints
- Use `protectedMutationProcedure` for authenticated mutations with CSRF protection
- Use `publicProcedure` only for login/public endpoints
- Always validate input with Zod schemas
```typescript
export const myRouter = router({
  list: protectedProcedure
    .input(z.object({ page: z.number() }))
    .query(async ({ input }) => { /* ... */ }),
  
  create: protectedMutationProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input }) => { /* ... */ }),
});
```

- **Frontend**: Use `trpc` hooks in components:
```typescript
const { data, isLoading } = trpc.tenders.list.useQuery();
const createMutation = trpc.tenders.create.useMutation();
```

### Form Handling
- Use `react-hook-form` with `@hookform/resolvers/zod`
- Define Zod schema first, then use with `useForm`
- Use `FormField` component from `components/ui/form.tsx`
```typescript
const formSchema = z.object({
  name: z.string().min(1, "Required"),
});

const form = useForm({
  resolver: zodResolver(formSchema),
});
```

### Styling Conventions
- Use **semantic color tokens** from CSS variables, NOT hardcoded colors:
  - `text-foreground`, `text-muted-foreground`
  - `bg-background`, `bg-card`, `bg-muted`
  - `border-border`
- Consistent spacing: `p-6`, `gap-1.5`, `gap-2`, `gap-4`
- Border radius: `rounded-lg` (inputs), `rounded-xl` (cards, icons)
- Typography: `text-sm` base, `font-medium` for labels
- Use Tailwind utility classes, avoid inline styles

### Component Structure
- Place reusable components in `client/src/components/`
- Page components go in `client/src/pages/`
- **DO NOT modify shadcn/ui base components** in `components/ui/` directly
- Create wrapper components if customization needed

### Database Operations
- All DB operations in `server/db/` directory
- Use Drizzle ORM queries, NOT raw SQL
- Use parameterized queries to prevent SQL injection
- Export typed functions from db modules
```typescript
export async function getTenderById(id: number) {
  return await db.query.tenders.findFirst({
    where: eq(tenders.id, id),
  });
}
```

### Security Best Practices
- **ALWAYS sanitize user input** using `inputValidationService` from `server/_core/input-validation.ts`
- **CSRF Protection**: All mutations use `protectedMutationProcedure` which includes CSRF validation
- **XSS Prevention**: Use `sanitizeForHtml()`, `sanitizeForAttribute()` helpers
- **SQL Injection**: Use Drizzle ORM parameterized queries, NEVER string concatenation
- **File Uploads**: Validate with `validateFileUpload()` from input-validation
- **Rate Limiting**: Applied automatically via middleware
- **Authentication**: JWT tokens validated in `auth-middleware.ts`

### Error Handling
- Use `TRPCError` for API errors:
```typescript
throw new TRPCError({
  code: "NOT_FOUND",
  message: "Resource not found",
});
```
- Common codes: `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `INTERNAL_SERVER_ERROR`

### Testing Patterns
- Unit tests in `server/**/*.test.ts` (Vitest)
- E2E tests in `e2e/*.spec.ts` (Playwright)
- Use property-based testing with `fast-check` for security tests
- Test security features: SQL injection, XSS, CSRF
- Mock database in unit tests, use real DB in E2E

## Commands Reference

### Development
```bash
pnpm run dev          # Start development server (port 3000)
pnpm run build        # Build for production
pnpm run start        # Start production server
pnpm run check        # TypeScript type checking
```

### Testing
```bash
pnpm run test         # Run unit tests (Vitest)
pnpm run test:e2e     # Run E2E tests (Playwright)
pnpm run test:all     # Run all tests
```

### Code Quality
```bash
pnpm run lint         # Run ESLint
pnpm run lint:fix     # Auto-fix lint issues
pnpm run format       # Format with Prettier
```

### Database
```bash
pnpm run db:push      # Generate migrations and apply to database
pnpm run seed         # Seed initial data
```

### Docker
```bash
pnpm run docker:dev           # Start dev containers
pnpm run docker:dev:stop      # Stop dev containers
pnpm run docker:prod:build    # Build prod containers
```

## Environment Variables

### Required
- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - 32+ character secret for JWT signing
- `VITE_APP_ID` - Manus app identifier
- `OAUTH_SERVER_URL` - OAuth server URL (e.g., https://oauth.manus.app)
- `OWNER_OPEN_ID` - Owner's OpenID for notifications
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

### Optional
- OCR APIs: `BUILT_IN_FORGE_API_URL`, `OCR_SPACE_API_KEY`
- AWS S3: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`
- Analytics: `VITE_ANALYTICS_ENDPOINT`, `VITE_ANALYTICS_WEBSITE_ID`

See `.env.example` for complete list.

## Common Development Tasks

### Adding a New Feature Module

1. **Database Schema** (if needed):
   - Add table to `drizzle/schema.ts`
   - Add relations to `drizzle/relations.ts`
   - Run `pnpm run db:push`

2. **Backend API**:
   - Create router in `server/routers/myfeature.router.ts`
   - Export from `server/routers/index.ts`
   - Add DB operations in `server/db/myfeature.ts`

3. **Frontend**:
   - Create page in `client/src/pages/MyFeature.tsx`
   - Use tRPC hooks to call API
   - Use existing UI components from `components/ui/`

4. **Tests**:
   - Unit tests in `server/myfeature.test.ts`
   - E2E tests in `e2e/myfeature.spec.ts`

### Adding a New shadcn/ui Component

```bash
# DO NOT manually create in components/ui/
# Use the CLI with pnpm:
pnpm dlx shadcn-ui@latest add <component-name>
```

### Modifying Authentication

- Auth logic in `server/_core/auth-middleware.ts`
- OAuth integration in `server/_core/oauth.ts`
- JWT utils in `server/_core/utils.ts`
- Login page: `client/src/pages/Login.tsx`

## Design System

### Colors
Use semantic tokens (defined in `client/src/index.css`):
- Foreground: `text-foreground`, `text-muted-foreground`, `text-secondary-foreground`
- Background: `bg-background`, `bg-card`, `bg-muted`, `bg-accent`
- Borders: `border-border`, `border-input`
- Primary: `bg-primary`, `text-primary`, `border-primary`
- Destructive: `bg-destructive`, `text-destructive-foreground`

### Typography
- Base: `text-sm`
- Headers: `text-lg font-semibold`, `text-xl font-bold`
- Labels: `text-sm font-medium`
- Muted: `text-sm text-muted-foreground`

### Layout
- Card padding: `p-6`
- Form spacing: `space-y-4`
- Grid gaps: `gap-4`, `gap-6`
- Icon sizes: `h-4 w-4`, `h-5 w-5`

## Special Considerations

### Express Type Extensions
- Extend Express Request interface in `server/types/db.ts`
- Use `declare global` with `Express` namespace
- Disable `@typescript-eslint/no-namespace` for server files (already configured)

### File Validation
- Use `validateFileUpload()` which returns `ValidationResult` with:
  - `isValid`: boolean
  - `errors`: string[]
  - `sanitizedValue`: sanitized data
  - `fileInfo.isSafe`: boolean for file uploads

### Notifications
- System sends notifications to owner via `notifyOwner()` from `server/_core/notification.ts`
- Real-time UI notifications via `NotificationContext`

### AI Features
- Tender intelligence in `server/ai/tender-analysis.ts`
- Document processing in `server/_core/ai-document-processor.ts`
- LLM integration in `server/_core/llm.ts`

## Anti-Patterns to Avoid

❌ **Don't use npm or yarn** - Always use pnpm
❌ **Don't modify shadcn/ui components directly** - Create wrappers
❌ **Don't use raw SQL queries** - Use Drizzle ORM
❌ **Don't concatenate user input in queries** - Use parameterized queries
❌ **Don't use hardcoded colors** - Use semantic tokens
❌ **Don't skip input validation** - Always sanitize user input
❌ **Don't use `publicProcedure` for authenticated endpoints** - Use `protectedProcedure`
❌ **Don't skip CSRF protection on mutations** - Use `protectedMutationProcedure`

## Code Review Checklist

When generating code, ensure:
- ✅ Uses pnpm (not npm)
- ✅ Input validation with Zod schemas
- ✅ Input sanitization for security
- ✅ Proper tRPC procedure types
- ✅ Semantic color tokens (not hardcoded)
- ✅ Type-safe database queries
- ✅ Error handling with TRPCError
- ✅ Tests for new features
- ✅ Consistent styling patterns
- ✅ No security vulnerabilities

## Additional Resources

- **Setup Guide**: See `SETUP_GUIDE.md` for detailed environment setup
- **Security**: See `SECURITY_IMPLEMENTATION_STATUS.md` for security features
- **Quick Reference**: See `QUICK_REFERENCE.md` for common tasks
- **Main README**: See `README.md` for project overview

## Notes for AI Assistants

- This is a production application handling healthcare business data - prioritize security
- Follow existing patterns rather than introducing new approaches
- When in doubt, check similar existing implementations in the codebase
- Test security features thoroughly (SQL injection, XSS, CSRF)
- Maintain backward compatibility with existing API endpoints
- Document complex business logic with comments
