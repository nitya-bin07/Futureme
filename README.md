# ✉️ FutureMe — Letters to Your Future Self

[🌐 Live Demo](https://futureme-tan.vercel.app/) · **[📁 GitHub](https://github.com/nitya-bin07/Futureme)

A full-stack web application for writing letters to your future self. Write today, receive them exactly when you choose — 6 months, 5 years, or 30 years from now.

---

## ✨ Features

### User Features
- ✅ Register / Login / JWT auth (7-day tokens)
- ✅ Forgot password with email reset link (1-hour expiry)
- ✅ 3-step compose wizard: Write → Details → Review
- ✅ Rich text editor (Tiptap) with writing prompts
- ✅ Draft autosave — never lose your work
- ✅ Schedule delivery for any future date (quick presets: 6m / 1y / 2y / 5y / 10y)
- ✅ AES-256-GCM letter encryption (per-user derived keys)
- ✅ Seal / lock letters permanently — can't be edited or deleted once sealed
- ✅ Mood tags (Hopeful, Reflective, Excited, Melancholic, Determined)
- ✅ Custom tags per letter
- ✅ Dashboard with stats and upcoming delivery timeline
- ✅ Full analytics: mood breakdown, word trends, delivery-time spread, tag cloud, writing streaks
- ✅ Collaboration — invite someone to co-write a letter via email
- ✅ Extend delivery date on unlocked letters
- ✅ Letter preview before delivery
- ✅ GDPR data export (full JSON) and account deletion

### Payments
- ✅ Credit-based system — 1 credit = 1 letter delivered
- ✅ 1 free credit on every new account (no card required)
- ✅ Real Stripe Checkout (hosted payment page, no card data touches your server)
- ✅ Webhook-verified credit delivery — credits only added after Stripe confirms payment
- ✅ Full transaction history

### Admin Panel (`/admin`)
- ✅ System stats (users, letters, deliveries, word count)
- ✅ User management — activate / deactivate accounts
- ✅ All letters overview with status filters
- ✅ Manual force-deliver any letter
- ✅ Audit log of all admin actions
- ✅ Monthly letter volume chart

### System
- ✅ Automatic email delivery via cron job (runs every minute)
- ✅ Retry logic — up to 3 delivery attempts per letter, error logged each time
- ✅ Rate limiting, Helmet.js security headers, CORS protection
- ✅ Admin-only `/api/debug` endpoint (auth-protected)

---

## 🛠 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Tiptap, Framer Motion, Axios |
| Backend | Express.js, Node.js, node-cron, bcryptjs, JWT |
| Database | **PostgreSQL** (via `pg`) — hosted on [Neon](https://neon.tech) |
| Hosting | Railway (backend) + Vercel (frontend) |
| Payments | **Stripe Checkout** + Stripe webhooks |
| Email | Nodemailer → Ethereal (dev) or Gmail / Resend (production) |
| Security | AES-256-GCM encryption, bcrypt, Helmet, rate limiting |

---

## 🚀 Local Development

### Prerequisites
- **Node.js 18+** — [Download here](https://nodejs.org)
- A **PostgreSQL database** — free at [neon.tech](https://neon.tech) (no install needed)
- A **Stripe account** — free at [stripe.com](https://stripe.com) (test mode, no real money)

### 1. Clone and install

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure `backend/.env`

Copy `.env.example` to `backend/.env` and fill in:

```env
# Server
PORT=3001
FRONTEND_URL=http://localhost:3000

# Security — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your_random_64_char_string
ENCRYPTION_SECRET=another_random_64_char_string

# Database (get your connection string from neon.tech after creating a project)
DATABASE_URL=postgresql://user:password@host:5432/database
PGSSL=require

# Stripe (get from dashboard.stripe.com → Developers → API Keys)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

# Email (leave empty to use Ethereal — fake test email, preview link appears in backend terminal)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=noreply@futureme.app
```

### 3. Start both servers

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```

Look for this output to confirm everything connected:
```
✅ Postgres schema ready
Admin user created - email: admin@futureme.local  password: Admin@123456
FutureMe backend running on port 3001
Stripe payments: enabled
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 — Stripe webhook tunnel (for payment testing):**
```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3001/api/webhooks/stripe
# Copy the whsec_... value it prints into STRIPE_WEBHOOK_SECRET in .env, then restart backend
```

### 4. Open the app

| URL | Description |
|---|---|
| `http://localhost:3000` | Main app |
| `http://localhost:3000/admin` | Admin panel |
| `http://localhost:3001/api/health` | Backend health check |

---

## 🔐 Admin Access

The admin account is seeded automatically on first boot:

| Field | Value |
|---|---|
| Email | `admin@futureme.local` |
| Password | `Admin@123456` |
| Role | Admin |

> ⚠️ **Change the admin password immediately after first login** — go to `/profile` → Change Password.

Admin access is protected at two layers:
- **Backend**: every `/api/admin/*` route requires `authenticate + requireAdmin` middleware
- **Frontend**: the `/admin` page redirects non-admins to `/dashboard` immediately

---

## 📁 Project Structure

```
Futureme/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express server, Stripe webhook, cron scheduler
│   │   ├── db.js                 # PostgreSQL pool, schema init, helper functions
│   │   ├── routes/
│   │   │   ├── auth.js           # Register, login, profile, forgot/reset password
│   │   │   ├── letters.js        # CRUD, draft autosave, publish, lock, encryption
│   │   │   ├── credits.js        # Stripe Checkout, webhook, transaction history
│   │   │   ├── analytics.js      # Mood breakdown, word trends, delivery spread
│   │   │   ├── collaborators.js  # Invite, accept, contribute, remove
│   │   │   ├── admin.js          # Stats, user management, force-deliver, audit log
│   │   │   ├── gdpr.js           # Data export, account deletion, delivery status
│   │   │   └── extra.js          # Extend delivery date
│   │   ├── services/
│   │   │   ├── encryption.js     # AES-256-GCM encrypt/decrypt (per-user keys)
│   │   │   └── email.js          # Nodemailer (Ethereal dev / SMTP production)
│   │   └── middleware/
│   │       └── auth.js           # JWT verify, requireAdmin guard
│   ├── package.json
│   └── .env                      # Your local config (never commit this)
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                        # Landing page
│   │   │   ├── auth/login/                     # Login
│   │   │   ├── auth/register/                  # Register
│   │   │   ├── auth/forgot-password/           # Request reset link
│   │   │   ├── auth/reset-password/[token]/    # Set new password
│   │   │   ├── dashboard/                      # Stats + upcoming deliveries
│   │   │   ├── compose/                        # 3-step letter wizard
│   │   │   ├── letters/[id]/                   # Letter detail + actions
│   │   │   ├── letters/preview/                # Letter preview
│   │   │   ├── analytics/                      # Charts and insights
│   │   │   ├── pricing/                        # Stripe Checkout
│   │   │   ├── profile/                        # Account settings
│   │   │   └── admin/                          # Admin panel
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   └── Footer.tsx
│   │   └── lib/
│   │       ├── api.ts            # Axios client + all API methods
│   │       └── auth.tsx          # Auth context (user, isAdmin, refreshUser)
│   ├── next.config.js            # Rewrites /api/* → backend URL
│   └── tailwind.config.js        # Design tokens (gold, parchment, ink)
│
├── .env.example                  # Template for backend/.env
├── start.sh                      # One-command start (checks .env + DATABASE_URL)
└── README.md
```

---

## 🗃️ Database Schema

All tables are created automatically on first boot — no manual SQL needed.

| Table | Purpose |
|---|---|
| `users` | Accounts, roles, credit balance |
| `letters` | All letters with encrypted content, delivery date, status |
| `credit_packages` | Purchasable credit packages (seeded on boot) |
| `credit_transactions` | Purchase history, credit usage, Stripe session IDs |
| `collaborators` | Co-author invites and contributions |
| `delivery_logs` | Email delivery history per letter |
| `password_resets` | Forgot-password tokens (1-hour expiry, single-use) |
| `audit_logs` | Admin action trail |

---

## 💳 Payments

Uses **Stripe Checkout** — Stripe's hosted payment page. Your server never handles raw card data.

**Flow:**
1. User clicks Buy → backend creates a Stripe Checkout session → user redirects to Stripe's page
2. User pays on Stripe's page → Stripe sends a `checkout.session.completed` webhook to your backend
3. Backend verifies the webhook signature → marks transaction completed → adds credits to user account
4. User is redirected back to `/pricing` with a success message

**Test card:** `4242 4242 4242 4242` — any future expiry, any CVC

**For local testing:** run `stripe listen --forward-to localhost:3001/api/webhooks/stripe` in a separate terminal to tunnel Stripe events to your local backend.

---

## 📧 Email

| Mode | Setup | How it works |
|---|---|---|
| **Ethereal (default)** | Nothing — works out of the box | Fake inbox, preview URL printed in backend terminal |
| **Gmail** | Set `EMAIL_USER` + `EMAIL_PASS` (App Password) | Real emails sent from your Gmail |
| **Resend** | Set `EMAIL_HOST=smtp.resend.com`, `EMAIL_USER=resend`, `EMAIL_PASS=re_...` | Best for production |

**Gmail App Password setup:** Google Account → Security → 2-Step Verification → App Passwords → Generate

---

## 🔒 Security

- Passwords hashed with **bcrypt** (10 rounds)
- Letter content encrypted with **AES-256-GCM** — per-user key derived from `ENCRYPTION_SECRET + user_id`
- JWT tokens expire in **7 days**
- Password reset tokens expire in **1 hour**, single-use only
- Stripe webhook signature verified with **HMAC-SHA256** before processing
- Rate limiting: 500 req / 15 min globally
- SQL injection safe: all queries use **parameterized `$1, $2...` placeholders**
- Security headers via **Helmet.js**
- CORS restricted to `FRONTEND_URL`
- `/api/debug` requires admin JWT — not publicly accessible

---

## 🌐 Deploying to Production

1. **Database**: already on Neon (PostgreSQL) — nothing to change
2. **Backend**: deploy to [Railway](https://railway.app) or [Render](https://render.com)
   - Set all env vars from `backend/.env` on the host
   - Start command: `npm start`
3. **Frontend**: deploy to [Vercel](https://vercel.com)
   - Set `BACKEND_URL` env var to your deployed backend URL
   - Vercel auto-detects Next.js
4. **Stripe webhook**: add a new endpoint in Stripe Dashboard → Developers → Webhooks → `https://yourbackend.com/api/webhooks/stripe` → event: `checkout.session.completed`
5. **Change admin password** before going live

---

Built with ❤️ — Letters sealed in time.
