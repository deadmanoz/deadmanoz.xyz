# deadmanoz.xyz Website Commands

node-run := "bash scripts/with-project-node.sh"

# Default command - show available commands
default:
    @just --list

# Install dependencies
install:
    {{node-run}} npm install

# Run development server (with git metadata by default)
dev:
    {{node-run}} npm run dev

# Run development server without git metadata (faster builds)
dev-fast:
    DISABLE_GIT_METADATA=true {{node-run}} npm run dev

# Generate RSS and Atom feeds into public/ (also runs automatically before build and dev; the output is not tracked)
generate-rss:
    {{node-run}} npm run generate-rss

# Optimise PNGs in-place with optipng (lossless, strips metadata). Pass a file or directory path.
optimize-pngs path:
    find {{path}} -name '*.png' -print0 | xargs -0 -n1 optipng -o7 -strip all -quiet

# Build for production (with git metadata by default)
build:
    {{node-run}} npm run build

# Build without git metadata (faster builds)
build-fast:
    DISABLE_GIT_METADATA=true {{node-run}} npm run build

# Start production server
start:
    {{node-run}} npm start

# Clean build artifacts
clean:
    rm -rf .next
    rm -rf out
    rm -rf node_modules

# Fresh install (clean + install)
fresh: clean install

# Run type checking
typecheck:
    {{node-run}} npx tsc --noEmit

# Run linter
lint:
    {{node-run}} npm run lint

# Run unit tests
test:
    {{node-run}} npx vitest run

# Run unit tests in watch mode
test-watch:
    {{node-run}} npx vitest

# Run Playwright E2E tests against the canary post (boots dev server)
e2e:
    {{node-run}} npx playwright test

# Run Playwright in UI mode (interactive)
e2e-ui:
    {{node-run}} npx playwright test --ui

# Check _posts markdown for one-sentence-per-line layout
check-prose *args:
    {{node-run}} npx tsx scripts/check-sentence-per-line.ts {{args}}

# Rewrite _posts markdown to one-sentence-per-line layout
fix-prose *args:
    {{node-run}} npx tsx scripts/check-sentence-per-line.ts --fix {{args}}

# Verify package-lock.json is in sync with package.json (what `npm ci` needs)
check-deps:
    {{node-run}} bash scripts/check-lockfile.sh

# Regenerate package-lock.json from package.json (never hand-edit the lock)
relock:
    {{node-run}} npm install --package-lock-only --ignore-scripts

# Run lint, typecheck, unit tests, sentence-per-line, and lock file checks
check: lint typecheck test check-prose check-deps

# Open in browser
open:
    open http://localhost:3000

# Start dev server and open browser
dev-open: 
    just dev &
    sleep 3
    just open

# Start fast dev server and open browser
dev-fast-open:
    just dev-fast &
    sleep 3
    just open

# Kill any process using port 3000
kill-port:
    lsof -ti:3000 | xargs kill -9 || true

# Restart dev server (kill port + start dev)
restart: kill-port dev

# Deploy to CloudFlare Workers (usually done via CI/CD)
deploy:
    {{node-run}} npm run build
    {{node-run}} npx wrangler deploy

# Preview deployment locally
preview:
    {{node-run}} npm run build
    {{node-run}} npx wrangler pages dev out

# Generate plot data from data-carry-research
generate-plots:
    ~/dev/research/data-carry/blog-tools/generate-plot-data.sh

# Generate cumulative P2MS plot from CSV data (mainnet.observer)
generate-cumulative-plot:
    {{node-run}} node ~/dev/research/data-carry/blog-tools/generate-p2ms-plot.js
