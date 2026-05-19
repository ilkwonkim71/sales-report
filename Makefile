.PHONY: dev build start lint lint-fix test test-watch test-coverage deploy deploy-preview db:migrate db:migrate:prod db:seed db:reset db:studio

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

# ── Database ───────────────────────────────────────────────────
db:migrate:
	npx prisma migrate dev

db:migrate:prod:
	npx prisma migrate deploy

db:seed:
	npx prisma db seed

db:reset:
	npx prisma migrate reset --force

db:studio:
	npx prisma studio
