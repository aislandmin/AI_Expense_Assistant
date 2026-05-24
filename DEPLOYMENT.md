# Deployment Guide

This project is deployed with:

```text
Frontend: Vercel
Backend API: Render Web Service
Database: Render Postgres
```

## 1. Render Postgres

Create the database first.

1. Open Render.
2. Click `New +`.
3. Choose `PostgreSQL`.
4. Use a name such as:

```text
ai-expense-assistant-db
```

5. Choose the same region you plan to use for the backend.
6. Create the database.
7. Copy the `Internal Database URL`.

Use the internal URL for the backend `DATABASE_URL` because the backend also runs on Render.

## 2. Render Backend

Create a Render Web Service from the same GitHub repo.

Render settings:

```text
Root Directory: server
Environment: Node
Build Command: npm ci --include=dev && npm run build && npm run db:migrate:deploy
Start Command: npm start
```

Backend environment variables on Render:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=use-a-long-random-production-secret
CLIENT_URL=https://your-vercel-app.vercel.app
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
NODE_ENV=production
```

Do not set `PORT` on Render. Render provides it automatically.

Do not put quotes around values in the Render dashboard.

Do not put `OPENAI_API_KEY` in frontend/Vercel environment variables.

After the backend deploys, open the Render backend URL. It should show:

```text
AI Expense Assistant API is running
```

For a portfolio/demo deployment, seed the production database after the backend is connected:

```bash
cd server
npm run db:seed
```

The seed script keeps the demo user identity:

```text
Email: test@example.com
Password: Password123!
```

## 3. Vercel Frontend

Create a Vercel project from the same GitHub repo.

Vercel settings:

```text
Framework Preset: Vite
Root Directory: client
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

Frontend environment variable on Vercel:

```env
API_URL=https://your-render-backend.onrender.com
```

`API_URL` is used by the Vercel `/api/*` proxy function. In production, the browser calls the Vercel app's own `/api/*` routes, and Vercel forwards those requests to Render. This keeps the auth cookie first-party for the Vercel site, which is more reliable on iPhone and in-app browsers.

The proxy is configured by `client/vercel.json`, which rewrites `/api/:path*` to the Vercel function at `client/api/proxy.ts`.

Do not set `VITE_API_URL` on Vercel for production unless you intentionally want the browser to call Render directly. Local development may still use `VITE_API_URL=http://localhost:5000`.

After Vercel deploys, copy the final Vercel URL and set it as `CLIENT_URL` on the Render backend:

```env
CLIENT_URL=https://your-vercel-app.vercel.app
```

Then redeploy or restart the Render backend.

## Environment Variable Notes

Local `.env` files may use quotes, but they are not required:

```env
CLIENT_URL=http://localhost:5173
OPENAI_MODEL=gpt-4o-mini
```

In hosted dashboards like Render and Vercel, enter values without quotes.

If an OpenAI key is accidentally exposed, revoke it in the OpenAI dashboard and create a new key.

## Common Issues

### Missing `DATABASE_URL`

If Render shows:

```text
Missing required environment variable: DATABASE_URL
```

Add `DATABASE_URL` to the Render backend Web Service environment variables, not only to the Render Postgres database.

### Missing `db:migrate:deploy`

If Render shows:

```text
Missing script: "db:migrate:deploy"
```

Push the latest `server/package.json` to GitHub, or use this build command directly:

```text
npm ci --include=dev && npm run build && npx prisma migrate deploy
```

### CORS Or Cookie Problems

If login works locally but fails in production, or if the UI shows `Authentication required` immediately after login, check:

```env
CLIENT_URL=https://your-vercel-app.vercel.app
NODE_ENV=production
API_URL=https://your-render-backend.onrender.com
```

`CLIENT_URL` must exactly match the deployed frontend origin. `NODE_ENV=production` is required so the backend sends a secure production cookie.

The production frontend should call same-origin `/api/*` routes through the Vercel proxy. This avoids relying on third-party cookies between `vercel.app` and `onrender.com`, which can fail in iPhone in-app browsers.

The frontend must also call the backend with:

```ts
credentials: "include"
```

The client service files already do this. After changing `CLIENT_URL`, `NODE_ENV`, or cookie behavior, commit and push the backend change, then redeploy or restart the Render backend.

## Post-Deploy Smoke Test

After deployment, test:

```text
Signup
Login
Quick Add
Manual entry
Ask AI
Insights
Expandable category statistics
CSV export
Logout
```
