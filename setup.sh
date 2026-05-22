#!/bin/bash
# BeyondSelf — One-command setup script
# Run this after cloning: chmod +x setup.sh && ./setup.sh

set -e
echo "🚀 BeyondSelf Setup Script"
echo "=========================="

# ── 1. Check Java ──────────────────────────────────────────────────────────
if ! command -v java &>/dev/null; then
  echo "❌ Java not found. Install Java 17+ from https://adoptium.net"
  exit 1
fi
JAVA_VER=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1)
echo "✅ Java $JAVA_VER found"

# ── 2. Check Node.js ───────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "❌ Node.js not found. Install from https://nodejs.org"
  exit 1
fi
echo "✅ Node $(node -v) found"

# ── 3. Check PostgreSQL ────────────────────────────────────────────────────
if ! command -v psql &>/dev/null; then
  echo "⚠️  PostgreSQL CLI not found."
  echo "   Install: brew install postgresql@15 (Mac) or apt install postgresql (Ubuntu)"
  echo "   Or use Docker: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_DB=digitaltwin postgres:15"
  echo ""
  echo "   Continuing... (you can set DB_URL, DB_USERNAME, DB_PASSWORD as env vars)"
else
  echo "✅ PostgreSQL found"
  # Create database if it doesn't exist
  DB_NAME=${DB_NAME:-digitaltwin}
  DB_USER=${DB_USERNAME:-$(whoami)}
  if psql -U "$DB_USER" -lqt 2>/dev/null | cut -d '|' -f 1 | grep -qw "$DB_NAME"; then
    echo "✅ Database '$DB_NAME' already exists"
  else
    echo "📦 Creating database '$DB_NAME'..."
    createdb -U "$DB_USER" "$DB_NAME" 2>/dev/null && echo "✅ Database created" || echo "⚠️  Could not create DB automatically. Create it manually: createdb digitaltwin"
  fi
fi

# ── 4. Backend .env setup ──────────────────────────────────────────────────
BACKEND_ENV="backend/.env"
if [ ! -f "$BACKEND_ENV" ]; then
  echo ""
  echo "📋 Backend environment setup"
  echo "   Copy and edit: backend/.env"
  cp backend/.env.example "$BACKEND_ENV" 2>/dev/null || true
fi

# ── 5. Install frontend dependencies ──────────────────────────────────────
echo ""
echo "📦 Installing frontend dependencies..."
npm install --silent
echo "✅ Frontend dependencies installed"

# ── 6. Done ───────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════"
echo "✅ Setup complete! Start the app with:"
echo ""
echo "  Terminal 1 (Backend):"
echo "    cd backend && mvn spring-boot:run"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    npm run dev"
echo ""
echo "  Open: http://localhost:5173"
echo ""
echo "  Demo login (no backend needed):"
echo "    Email: arjun@demo.com  Password: demo123"
echo "    Email: priya@demo.com  Password: demo123"
echo "═══════════════════════════════════════"
