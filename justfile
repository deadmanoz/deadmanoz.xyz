# deadmanoz.xyz Website Commands

# Default command - show available commands
default:
    @just --list

# Install dependencies
install:
    npm install

# Run development server
dev:
    npm run dev

# Build for production
build:
    npm run build

# Start production server
start:
    npm start

# Clean build artifacts
clean:
    rm -rf .next
    rm -rf out
    rm -rf node_modules

# Fresh install (clean + install)
fresh: clean install

# Run type checking
typecheck:
    npx tsc --noEmit

# Run linter
lint:
    npm run lint

# Run both lint and typecheck
check: lint typecheck

# Open in browser
open:
    open http://localhost:3000

# Start dev server and open browser
dev-open: 
    just dev &
    sleep 3
    just open

# Kill any process using port 3000
kill-port:
    lsof -ti:3000 | xargs kill -9 || true

# Restart dev server (kill port + start dev)
restart: kill-port dev

# Deploy to CloudFlare Workers
deploy:
    npm run build
    npx wrangler pages deploy out

# Preview deployment locally
preview:
    npm run build
    npx wrangler pages dev out