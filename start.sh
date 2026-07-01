#!/bin/bash

# ─────────────────────────────────────────────────────────
# FutureMe - Delayed Letter Delivery System
# Start Script
# ─────────────────────────────────────────────────────────

set -e

GREEN='\033[0;32m'
GOLD='\033[0;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'

clear
echo ""
echo -e "${GOLD}${BOLD}  ╔═══════════════════════════════════════════════╗${NC}"
echo -e "${GOLD}${BOLD}  ║           FutureMe — Letters to Time          ║${NC}"
echo -e "${GOLD}${BOLD}  ╚═══════════════════════════════════════════════╝${NC}"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js not found. Install from https://nodejs.org${NC}"
  exit 1
fi

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 22 ]; then
 echo -e "${RED}❌ Node.js 22.5+ required. Current: $(node -v)${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v)${NC}"
echo ""

# Check for backend/.env with a DATABASE_URL set
if [ ! -f "backend/.env" ]; then
  echo -e "${RED}❌ backend/.env not found.${NC}"
  echo -e "   Copy .env.example to backend/.env and fill in DATABASE_URL (Postgres) before starting."
  exit 1
fi
if ! grep -q "^DATABASE_URL=postgresql://" backend/.env 2>/dev/null; then
  echo -e "${RED}❌ DATABASE_URL is missing or not set in backend/.env${NC}"
  echo -e "   This app now requires PostgreSQL — see .env.example for the format."
  exit 1
fi
echo -e "${GREEN}✅ backend/.env found${NC}"
echo ""

# Install backend deps
echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
cd backend
if [ ! -d "node_modules" ]; then
  npm install --silent
fi
echo -e "${GREEN}✅ Backend ready${NC}"
cd ..

# Install frontend deps
echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
cd frontend
if [ ! -d "node_modules" ]; then
  npm install --silent
fi
echo -e "${GREEN}✅ Frontend ready${NC}"
cd ..

echo ""
echo -e "${GOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GOLD}${BOLD}  🚀 Starting servers...${NC}"
echo -e "${GOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${GREEN}Frontend:${NC} http://localhost:3000"
echo -e "  ${GREEN}Backend:${NC}  http://localhost:3001"
echo ""
echo -e "  ${GOLD}Admin login:${NC}"
echo -e "    Email:    admin@futureme.local"
echo -e "    Password: Admin@123456"
echo ""
echo -e "${GOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Press Ctrl+C to stop"
echo -e "${GOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Start both servers
(cd backend && node src/index.js) &
BACKEND_PID=$!

(cd frontend && npm run dev) &
FRONTEND_PID=$!

# Wait for Ctrl+C
trap "echo ''; echo -e '${GOLD}Shutting down...${NC}'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo -e '${GREEN}Goodbye!${NC}'; exit 0" SIGINT SIGTERM

wait
