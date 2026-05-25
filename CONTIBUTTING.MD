# Contributing to FutureMe ✉️

Thanks for your interest in contributing! FutureMe is an open-source delayed letter delivery system — write a letter today, receive it in the future.

## Getting Started

### 1. Fork & Clone
```bash
git clone https://github.com/nitya-bin07/Futureme.git
cd Futureme
```

### 2. Set up environment
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your values (defaults work fine for local dev)
```

### 3. Run the project
```bash
# Option A — One command (requires Git Bash on Windows)
chmod +x start.sh
./start.sh

# Option B — Manual (two terminals)
# Terminal 1:
cd backend && npm install && node src/index.js

# Terminal 2:
cd frontend && npm install && npm run dev
```

### 4. Open in browser
- Frontend: http://localhost:3000
- Backend health: http://localhost:3001/api/health
- Default admin: `admin@futureme.local` / `Admin@123456`

---

## How to Contribute

### Step 1 — Find an issue
- Go to the [Issues tab](../../issues)
- Look for issues labeled `good first issue` if you're new
- Comment "I'd like to work on this" before starting

### Step 2 — Create a branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### Step 3 — Make your changes
- Keep changes focused — one issue per PR
- Test your changes locally before submitting

### Step 4 — Submit a PR
- Push your branch and open a Pull Request
- Fill in the PR template
- Link the issue you're fixing (e.g. `Closes #12`)

---

## Project Structure

```
Futureme/
├── backend/                  # Express.js API
│   └── src/
│       ├── index.js          # Server entry + cron scheduler
│       ├── db.js             # SQLite setup
│       ├── routes/           # API routes
│       ├── services/         # Email + encryption
│       └── middleware/       # JWT auth
│
├── frontend/                 # Next.js 14
│   └── src/
│       ├── app/              # Pages (App Router)
│       ├── components/       # Navbar, Footer, Editor
│       └── lib/              # API client, auth context
│
└── start.sh                  # One-command start script
```

---

## Good First Issues

Not sure where to start? Here are some beginner-friendly tasks:

- Add dark/light mode toggle
- Add letter character/word count display
- Fix mobile responsiveness on compose page
- Add loading skeleton components
- Write a deployment guide for Vercel + Railway

---

## Guidelines

- Be respectful and welcoming
- Write clean, readable code
- Don't break existing features
- If you're unsure, open an issue and ask first

---

Built with ❤️ — Letters sealed in time.
