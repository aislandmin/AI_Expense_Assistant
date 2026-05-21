# AI Expense Assistant

AI Expense Assistant is a full-stack personal finance workspace for tracking spending and asking natural-language questions about financial history.

The goal is to feel like "ChatGPT for personal spending": users can manually add expenses or income, use Quick Add to describe a transaction in plain English, review charts and summaries, and ask AI questions grounded in saved records.

## Features

- JWT authentication with an httpOnly cookie
- Manual expense and income entry
- Natural-language Quick Add for expenses and income
- AI-assisted amount, category, subcategory, merchant, and date detection
- Protected app workspace with Insights, Ask AI, and Entries pages
- Period-based financial insights
- Spending by category chart and daily spending/income trend chart
- Recent entries and paginated entry history
- Edit and delete saved records with delete confirmation
- CSV export for selected periods
- PostgreSQL data model managed with Prisma

## Technical Highlights

- Full-stack TypeScript implementation with separate React/Vite client and Express API server
- Protected API routes using JWT verification middleware and user-scoped Prisma queries
- Secure password storage with `bcryptjs`
- Cookie-based auth using `httpOnly`, `sameSite: "lax"`, and production-only `secure` cookies
- AI workflow designed around structured outputs instead of free-form database access
- Prisma-backed financial calculations so totals, charts, exports, and AI answers are grounded in saved records
- Income is modeled as an entry category but excluded from spending totals and category spending charts
- Reusable period selection logic for insights, history filtering, and CSV export workflows
- Graceful fallback behavior when `OPENAI_API_KEY` is not configured

## Tech Stack

Frontend:

- React
- Vite
- TypeScript
- React Router
- Recharts

Backend:

- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL
- bcryptjs
- JSON Web Tokens

AI:

- OpenAI API for structured expense parsing and financial answers
- Deterministic fallback parsing when no OpenAI API key is configured

## Architecture

```text
React client
  -> typed service layer
  -> Express REST API
  -> auth middleware
  -> route handlers
  -> service functions
  -> Prisma
  -> PostgreSQL
```

The app keeps user-facing workflows in the client and financial/business rules on the server. The client never calculates authoritative totals for summaries, insights, exports, or AI answers. Those values come from server-side Prisma queries scoped to the authenticated user.

### Authentication Flow

```text
signup/login
  -> validate request
  -> hash or compare password with bcryptjs
  -> sign JWT
  -> store JWT in ai_expense_auth httpOnly cookie
  -> protected requests use credentials: "include"
  -> requireAuth middleware verifies cookie and loads req.user
```

The app does not store tokens in `localStorage`. Each protected expense and AI route uses the authenticated user id so one user's records are not visible to another user.

### AI Question Flow

The Ask AI feature uses AI to understand the question, not to calculate money.

```text
User question
  -> POST /api/ai/ask
  -> OpenAI structured intent parsing, or rule-based fallback
  -> safe backend intent execution
  -> Prisma query for the authenticated user's records
  -> deterministic TypeScript calculation
  -> grounded natural-language response
```

Example:

```text
"How much did I spend on gas last month?"
  -> intent: category_total
  -> category: Transportation
  -> subcategory: Gas
  -> period: last_month
```

The backend then queries saved entries for that date range and user, filters by category/subcategory, sums the values, and returns the answer. The AI does not generate SQL and does not invent financial data.

### Quick Add Flow

```text
Natural-language entry text
  -> POST /api/ai/parse-expense
  -> OpenAI structured parsing, or deterministic fallback parser
  -> parsed amount/category/subcategory/merchant/date
  -> user reviews the populated form
  -> saved through POST /api/expenses
```

This keeps the final saved record under user control while still making entry creation fast.

### Insights Flow

```text
Selected period
  -> GET /api/expenses/insights?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
  -> Prisma query
  -> split Income from spending
  -> calculate totalSpending, totalIncome, net, byCategory, dailyTrend
  -> render insight cards and charts
```

Chart data is calculated from PostgreSQL records, not from AI responses.

## Project Structure

```text
.
|-- client/
|   |-- src/
|   |   |-- components/
|   |   |-- context/
|   |   |-- layouts/
|   |   |-- pages/
|   |   |-- services/
|   |   |-- types/
|   |   `-- App.tsx
|   `-- package.json
|
|-- server/
|   |-- src/
|   |   |-- middleware/
|   |   |-- routes/
|   |   |-- services/
|   |   |-- types/
|   |   |-- utils/
|   |   `-- index.ts
|   |-- prisma/
|   |   |-- migrations/
|   |   |-- schema.prisma
|   |   `-- seed.ts
|   `-- package.json
|
|-- AGENTS.md
|-- README.md
`-- .gitignore
```

## Getting Started

### Prerequisites

- Node.js
- npm
- PostgreSQL

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd ai-expense-assistant
```

### 2. Install dependencies

```bash
cd server
npm install

cd ../client
npm install
```

### 3. Configure environment variables

Create `server/.env` from the example file:

```bash
cd server
cp .env.example .env
```

Then update `DATABASE_URL` and `JWT_SECRET` in `server/.env`.

The server environment variables are:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma. |
| `JWT_SECRET` | Yes in production | Secret used to sign the auth cookie JWT. Local development has a fallback, but setting this is recommended. |
| `CLIENT_URL` | No | Frontend origin allowed by CORS. Defaults to `http://localhost:5173`. |
| `PORT` | No | Express API port. Defaults to `5000`. |
| `OPENAI_API_KEY` | No | Enables OpenAI-powered parsing and AI answers. If empty, Quick Add falls back to rule-based parsing. |
| `OPENAI_MODEL` | No | OpenAI model name. Defaults to `gpt-4o-mini`. |

Create `client/.env` if your API URL is different from the default:

```env
VITE_API_URL="http://localhost:5000"
```

### 4. Set up the database

```bash
cd server
npx prisma migrate dev
npm run db:seed
```

The seed script creates demo data for:

```text
Email: test@example.com
Password: Password123!
```

### 5. Run the app locally

Start the API:

```bash
cd server
npm run dev
```

Start the client in a second terminal:

```bash
cd client
npm run dev
```

Open:

```text
http://localhost:5173
```

## Available Scripts

Client:

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

Server:

```bash
npm run dev
npm run db:seed
```

Useful Prisma commands:

```bash
npx prisma migrate dev
npx prisma studio
```

## Main API Routes

Auth:

```text
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

Entries:

```text
POST   /api/expenses
GET    /api/expenses
PUT    /api/expenses/:id
DELETE /api/expenses/:id
GET    /api/expenses/summary
GET    /api/expenses/insights
GET    /api/expenses/export
```

AI:

```text
POST /api/ai/parse-expense
POST /api/ai/ask
```

## Product Notes

Income is tracked separately from spending. Summary and insight totals treat:

- `totalSpending` as spending only
- `totalIncome` as income only
- `net` as income minus spending

Chart data and insight totals are calculated from saved PostgreSQL records through Prisma. AI is used to parse natural-language input and explain grounded results, not to invent financial data.

## Data Model

The MVP centers on two Prisma models:

- `User`: name, email, hashed password, and related entries
- `Expense`: amount, category, optional subcategory, description, merchant, date, and optional user relation

`Expense` is used for both spending and income entries. Income is stored with category `Income`, then separated in summary and insight calculations.

## Validation and Error Handling

- Auth endpoints validate required fields and email format.
- Passwords must be at least 8 characters on signup.
- Protected routes return `401` when the auth cookie is missing or invalid.
- Date range endpoints validate `YYYY-MM-DD` inputs and reject invalid ranges.
- Client forms show user-facing validation and request errors.
- AI parsing falls back to deterministic rules when OpenAI is unavailable.

## Frontend Notes

- Public routes: Home, Tutorial, Login, Sign Up
- Protected workspace routes: Insights, Ask AI, Entries
- Browser autofill is supported with standard `name`, `id`, and `autoComplete` attributes on auth forms.
- Voice input on the Ask page uses the browser Web Speech API when available; submitted text still goes through the same Ask AI backend flow.
- Entry edit/delete actions are available directly on rows, with delete confirmation before removal.

## Quality Checks

Run these before pushing changes:

```bash
cd client
npm run lint
npm run build

cd ../server
npx tsc --noEmit
```

## Status

This is an MVP portfolio project focused on the core AI finance workflow: add entries, inspect financial patterns, and ask questions about saved spending history.
