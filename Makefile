.PHONY: dev build start lint lint-fix test test-watch test-coverage deploy deploy-preview

# ── Local development ──────────────────────────────────────────
dev:
	npm run dev

build:
	npm run build

start:
	npm run start

# ── Code quality ───────────────────────────────────────────────
lint:
	npm run lint

lint-fix:
	npm run lint:fix

# ── Tests ──────────────────────────────────────────────────────
test:
	npm test

test-watch:
	npm run test:watch

test-coverage:
	npm run test:coverage

# ── Deployment ─────────────────────────────────────────────────
deploy:
	npx vercel --prod --yes

deploy-preview:
	npx vercel --yes
