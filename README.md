# ✉️ FutureMe — Delayed Letter Delivery System

A production-grade web application for writing letters to your future self. 
Seal your words today, receive them exactly when you choose.

## 🚀 Quick Start (Localhost)

### Prerequisites
- **Node.js 18+** — [Download here](https://nodejs.org)
- **npm** (comes with Node.js)

### 1. Start Everything
```bash
chmod +x start.sh
./start.sh
```

That's it! The script installs dependencies and starts both servers.

### 2. Manual Start (alternative)

**Terminal 1 — Backend:**
```bash
cd backend
npm install
node src/index.js
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 🌐 Access the App

| URL | Description |
|-----|-------------|
| http://localhost:3000 | Frontend (main app) |
| http://localhost:3001/api/health | Backend health check |

## 🔐 Default Login

| Field | Value |
|-------|-------|
| Email | admin@futureme.local |
| Password | Admin@123456 |
| Role | Admin |

> ⚠️ **Change the admin password after first login!**

## 📁 Project Structure

```
delayed-letter-app/
├── backend/                    # Express.js API server
│   ├── src/
│   │   ├── index.js            # Main server + cron scheduler
│   │   ├── db.js               # SQLite database setup
│   │   ├── routes/
│   │   │   ├── auth.js         # Login, register, profile
│   │   │   ├── letters.js      # CRUD + encryption
│   │   │   └── admin.js        # Admin management
│   │   ├── services/
│   │   │   ├── encryption.js   # AES-256-GCM encrypt/decrypt
│   │   │   └── email.js        # Email delivery (nodemailer)
│   │   └── middleware/
│   │       └── auth.js         # JWT authentication
│   ├── data/                   # SQLite DB (auto-created)
│   └── .env                    # Environment config
│
├── frontend/                   # Next.js 14 app
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx        # Landing page
│   │   │   ├── auth/           # Login & register
│   │   │   ├── dashboard/      # User dashboard
│   │   │   ├── compose/        # Letter composer
│   │   │   ├── letters/[id]/   # Letter detail view
│   │   │   └── admin/          # Admin panel
│   │   ├── components/         # Navbar, Footer
│   │   └── lib/
│   │       ├── api.ts          # Axios API client
│   │       └── auth.tsx        # Auth context
│   └── tailwind.config.js      # Design system
│
└── start.sh                    # One-command start script
```

## 🔧 Configuration

Edit `backend/.env` to configure:

```env
# Server
PORT=3001
JWT_SECRET=your-secret-key-min-32-chars

# Email (defaults to Ethereal test email)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@futureme.app
```

### Email Setup Options

**Option 1: Ethereal (default, for testing)**
No config needed! The app auto-creates an Ethereal test account.
Check the backend console for a preview URL after sending.

**Option 2: Gmail**
1. Enable 2FA on your Google account
2. Create an App Password: Google Account → Security → App Passwords
3. Set `EMAIL_USER=your@gmail.com` and `EMAIL_PASS=your-app-password`

**Option 3: Resend/SendGrid (production)**
```env
EMAIL_HOST=smtp.resend.com
EMAIL_PORT=587
EMAIL_USER=resend
EMAIL_PASS=re_your_api_key
```

## ✨ Features

### User Features
- ✅ Register / Login with JWT auth
- ✅ Write letters with rich textarea + writing prompts
- ✅ 3-step compose wizard (Write → Details → Review)
- ✅ Schedule delivery for any future date
- ✅ Quick date presets (6 months, 1y, 2y, 5y, 10y)
- ✅ AES-256-GCM letter encryption
- ✅ Seal/lock letters permanently
- ✅ Tag letters with moods (Hopeful, Reflective, etc.)
- ✅ Add searchable tags
- ✅ Dashboard with stats & upcoming deliveries
- ✅ Edit or delete drafts
- ✅ View full letter with metadata

### Admin Features  
- ✅ Admin dashboard with system stats
- ✅ User management (activate/deactivate)
- ✅ All letters overview
- ✅ Manual letter delivery trigger
- ✅ Audit log of all actions
- ✅ Letters by status breakdown

### System Features
- ✅ Automatic delivery via cron scheduler (runs every minute)
- ✅ Retry logic (up to 3 attempts)
- ✅ Rate limiting (200 req/15min global, 20 req/15min auth)
- ✅ CORS protection
- ✅ Helmet.js security headers
- ✅ Audit logging
- ✅ SQLite database (zero config, local file)

## 🗃️ Database

The app uses **SQLite** for local development (zero setup). 
Database is auto-created at `backend/data/letters.db`.

**Tables:**
- `users` — User accounts
- `letters` — All letters (encrypted content)
- `delivery_logs` — Email delivery history
- `sessions` — Active sessions
- `audit_logs` — Security audit trail

## 🚀 Production Deployment

When ready for production, replace:
- **SQLite** → PostgreSQL
- **Local email** → Resend/SendGrid  
- **Local hosting** → Vercel (frontend) + Railway/AWS (backend)

See the original roadmap PDF for full production architecture.

## 🔒 Security

- Passwords hashed with bcrypt (12 rounds)
- Letters encrypted with AES-256-GCM (per-user keys)
- JWT tokens expire in 7 days
- Rate limiting on all endpoints
- SQL injection prevention (parameterized queries)
- Security headers via Helmet.js
- CORS restricted to frontend URL

---

Built with ❤️ — Letters sealed in time.
