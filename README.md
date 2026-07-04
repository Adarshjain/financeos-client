# FinanceOS Frontend

A production-grade personal finance management frontend built with Next.js 14, TypeScript, and Server Components.

## Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Cookie-based session auth
- **Data Fetching**: Server Components + Server Actions

## Features

- 🔐 **Authentication**: Login/logout with session cookies
- 💳 **Accounts**: Create and manage financial accounts (bank, credit card, stock, mutual fund)
- 💰 **Transactions**: Record income and expenses
- 📈 **Investments**: Track buy/sell transactions with FIFO position calculation
- 📧 **Gmail Integration**: Connect Gmail for transaction sync (skeleton)
- 🎨 **Modern UI**: Dark theme with emerald accent colors

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- FinanceOS backend running on `http://localhost:6969`

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

### Environment Variables

| Variable       | Description          | Default                 |
| -------------- | -------------------- | ----------------------- |
| `API_BASE_URL` | Backend API base URL | `http://localhost:6969` |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (protected)/        # Authenticated routes
│   │   ├── dashboard/      # Dashboard (placeholder)
│   │   ├── accounts/       # Account management
│   │   ├── transactions/   # Transaction tracking
│   │   ├── investments/    # Investment trading
│   │   └── settings/       # User settings
│   ├── login/              # Login page
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Root redirect
├── actions/                # Server actions
│   ├── auth.ts             # Authentication actions
│   ├── accounts.ts         # Account actions
│   ├── transactions.ts     # Transaction actions
│   ├── investments.ts      # Investment actions
│   └── gmail.ts            # Gmail integration actions
├── components/             # React components
│   ├── forms/              # Form components
│   ├── layout/             # Layout components
│   └── ui/                 # UI primitives
├── lib/                    # Utilities
│   ├── apiClient.ts       # Typed API client
│   ├── auth.ts             # Auth utilities
│   ├── types.ts            # TypeScript types
│   └── utils.ts            # Helper functions
└── middleware.ts           # Auth middleware
```

## API Contract

The frontend is built against the OpenAPI 3.0 specification defined in `api-spec.yaml`. Key endpoints:

- `POST /api/v1/auth/login` - Authenticate user
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/accounts` - Create account
- `POST /api/v1/transactions` - Create transaction
- `POST /api/v1/investments/transactions` - Create investment transaction
- `GET /api/v1/investments/position` - Get FIFO positions

## Design Principles

1. **Server-first**: All data fetching happens on the server
2. **Money as strings**: All monetary values are strings to avoid floating-point issues
3. **No client aggregation**: All calculations happen on the backend
4. **HTTP-only cookies**: Session tokens are never exposed to JavaScript

## Default Credentials

```
Email: admin@financeos.local
Password: changeme
```

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Run ESLint
npm run typecheck # Run TypeScript check
```

## License

MIT
