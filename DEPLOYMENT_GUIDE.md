# FutureMe — Production Deployment Guide

This covers everything needed to take FutureMe from local SQLite/simulated-payments to a real, deployable app on PostgreSQL with real Stripe payments.

## What changed in this migration

- **Database**: SQLite → PostgreSQL. Every query across every route file was rewritten as async/await with `$1, $2...` placeholders (Postgres syntax) instead of SQLite's `?`.
- **Payments**: simulated `mock_` checkout → real **Stripe Checkout** (hosted payment page) + webhook for confirming payment.
- **Bug fixes found along the way**: a mismatched `<Link>/<button>` JSX tag that broke the production build entirely, a wrong API path on the letter preview page (was calling a route that doesn't exist), and 4 pages using `useSearchParams()` without the `<Suspense>` boundary Next.js requires for a production build.
- Everything was tested end-to-end against a real local Postgres instance — registration, login, letter creation, dashboard stats, analytics, GDPR export, admin panel, and the delivery cron job, all confirmed working with real SQL queries (not mocked).

## 1. Set up PostgreSQL

Pick one (all have generous free tiers):

- **[Supabase](https://supabase.com)** — easiest, includes a UI to browse your data
- **[Neon](https://neon.tech)** — serverless Postgres, scales to zero when idle
- **[Railway](https://railway.app)** — good if you're also hosting the backend there

After creating a project, copy the connection string — it looks like:
```
postgresql://user:password@host:5432/database
```

## 2. Apply this migration

Unzip into your project root (overwrites the files below, same merge pattern as before):
```
backend/package.json          (added pg, stripe dependencies)
backend/src/db.js             (full Postgres schema + init)
backend/src/index.js          (async cron, Stripe webhook route)
backend/src/middleware/auth.js
backend/src/routes/*.js       (every route converted to async/Postgres)
frontend/src/lib/api.ts       (real Stripe checkout calls)
frontend/next.config.js       (backend URL now configurable)
frontend/src/app/pricing/page.tsx           (real Stripe checkout flow)
frontend/src/app/letters/[id]/page.tsx      (bug fix + Suspense fix)
frontend/src/app/letters/preview/page.tsx   (bug fix + Suspense fix)
frontend/src/app/compose/page.tsx           (Suspense fix)
start.sh
.env.example
```

Then install the new backend dependencies:
```bash
cd backend
npm install
```

## 3. Set up Stripe

1. Create a free account at [stripe.com](https://dashboard.stripe.com/register)
2. Stay in **test mode** while developing (toggle top-right of dashboard)
3. Go to **Developers → API keys** → copy your **Secret key** (`sk_test_...`)
4. For the webhook secret, you have two options:

   **Local testing** — install the [Stripe CLI](https://stripe.com/docs/stripe-cli), then:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3001/api/webhooks/stripe
   ```
   This prints a `whsec_...` value — use that locally.

   **Production** — in the Stripe dashboard: **Developers → Webhooks → Add endpoint** → URL = `https://yourbackend.com/api/webhooks/stripe` → select event `checkout.session.completed` (and optionally `checkout.session.expired`) → copy the **Signing secret** shown.

5. Test card number for test mode: `4242 4242 4242 4242`, any future expiry, any CVC.

## 4. Fill in `backend/.env`

```
DATABASE_URL=postgresql://user:password@host:5432/database
PGSSL=require

JWT_SECRET=<generate a random 64-char string>
ENCRYPTION_SECRET=<generate a different random 64-char string>

FRONTEND_URL=https://yourapp.com

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=you@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAIL_FROM=noreply@yourapp.com
```

Generate secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 5. Deploy

**Backend** (Railway, Render, or Fly.io all work well):
- Set the environment variables above on the host
- Build command: `npm install`
- Start command: `npm start`
- The Postgres schema creates itself automatically on first boot — no manual migration step

**Frontend** (Vercel is the natural fit for Next.js):
- Set `BACKEND_URL` env var to your deployed backend's URL
- Deploy as normal — Vercel auto-detects Next.js

## 6. After deploying — verify the loop

1. Visit your live site, register an account
2. Go to `/pricing`, buy the smallest package using Stripe's test card
3. You should land back on `/pricing?checkout=success`, see a confirmation, and your credit balance should update within a couple seconds (the page polls briefly while waiting for Stripe's webhook to land)
4. Check your backend logs for `✅ Stripe payment completed` — confirms the webhook fired and was verified correctly
5. Change `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` to your **live** mode keys only once you're ready to accept real money — test mode and live mode keys are completely separate in Stripe

## Notes

- The `/api/debug` route still requires admin login (fixed earlier) — leave it protected, don't remove the auth check.
- Change the seeded admin password (`admin@futureme.local` / `Admin@123456`) immediately after your first deploy.
- `next@14.1.0` (used by this project) has a known security advisory — worth upgrading to a patched 14.x version when you have time, separate from this migration.
