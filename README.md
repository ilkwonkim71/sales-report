# 영업 일일 보고 시스템

영업 사원이 매일 고객 방문 기록과 과제·계획을 보고하고, 상급자가 댓글로 피드백을 남기는 웹 애플리케이션입니다.

## Tech Stack

| 영역 | 기술 |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript 5 |
| Backend | Next.js API Routes (Route Handlers) |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| Database | PostgreSQL 14+ |
| Auth | JWT (`jsonwebtoken`) |
| Testing | Jest 30, Testing Library, jest-environment-jsdom |
| Code Quality | ESLint, TypeScript strict, Husky + lint-staged |

## 사전 요구 사항

- **Node.js** ≥ 20
- **npm** ≥ 10
- **PostgreSQL** ≥ 14

## 빠른 시작

```bash
# 1. 저장소 클론
git clone https://github.com/ilkwonkim71/sales-report.git
cd sales-report

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 DATABASE_URL, JWT_SECRET 값을 수정

# 4. DB 마이그레이션 실행
make db:migrate          # npx prisma migrate dev

# 5. 시드 데이터 삽입
make db:seed             # npx prisma db seed

# 6. 개발 서버 시작
make dev                 # npm run dev  →  http://localhost:3000
```

## 환경 변수

`.env.example`을 복사하여 `.env`를 만들고 아래 항목을 채웁니다.

| 변수 | 필수 | 설명 |
|---|---|---|
| `DATABASE_URL` | ✓ | PostgreSQL 연결 URL |
| `JWT_SECRET` | ✓ | JWT 서명 비밀 키 (32자 이상 권장) |
| `JWT_EXPIRES_IN` | ✓ | 토큰 만료 기간 (예: `7d`, `24h`) |
| `NODE_ENV` | | `development` / `production` / `test` |
| `NEXT_PUBLIC_API_BASE_URL` | | 클라이언트에서 호출할 API 베이스 URL |

> **보안 주의**: `.env` 파일은 `.gitignore`에 포함되어 있습니다. 실제 값을 절대 커밋하지 마세요.

## 프로젝트 구조

```
sales-report/
├── prisma/
│   ├── schema.prisma          # 데이터 모델 정의
│   ├── seed.ts                # 테스트 데이터 시드 스크립트
│   └── migrations/            # 마이그레이션 SQL 파일
├── prisma.config.ts           # Prisma 7 datasource 설정
├── src/
│   ├── app/                   # Next.js App Router
│   │   └── api/v1/            # REST API Route Handlers
│   ├── components/            # 공통 UI 컴포넌트
│   ├── lib/
│   │   ├── env.ts             # 환경 변수 검증 유틸
│   │   ├── prisma.ts          # Prisma Client 싱글턴 (Issue #2)
│   │   ├── jwt.ts             # JWT sign / verify (Issue #2)
│   │   └── auth.ts            # withAuth 미들웨어 (Issue #2)
│   ├── types/                 # 도메인 타입 정의
│   │   ├── api.ts             # API 응답 래퍼 타입
│   │   ├── auth.ts            # 인증 관련 타입
│   │   ├── report.ts          # 보고서 타입
│   │   ├── customer.ts        # 고객 타입
│   │   ├── staff.ts           # 영업사원 타입
│   │   └── index.ts           # 배럴 내보내기
│   └── __tests__/             # 단위 테스트
├── .env.example               # 환경 변수 템플릿
├── Makefile                   # 개발 편의 명령어
└── openapi.yaml               # API 명세 (OpenAPI 3.0)
```

## 데이터 모델

```
SALES_STAFF ──< DAILY_REPORT ──< VISIT_RECORD >── CUSTOMER
                     │
                     └──< COMMENT >── SALES_STAFF (author, SUPERVISOR only)
```

- `DAILY_REPORT`: 사원당 하루 1건 (`sales_staff_id + report_date` UNIQUE)
- `VISIT_RECORD`: 보고서당 최소 1건 유지 (마지막 행 삭제 불가)
- `COMMENT`: `SUPERVISOR` 역할 사용자만 작성 가능

## 테스트 계정 (시드 데이터)

| 이메일 | 비밀번호 | 역할 | 이름 |
|---|---|---|---|
| `staff1@test.com` | `password123` | STAFF | 홍길동 |
| `staff2@test.com` | `password123` | STAFF | 김영수 |
| `super@test.com` | `password123` | SUPERVISOR | 이상급 |

## 사용 가능한 명령어

### Make 타겟

```bash
make dev              # 개발 서버 실행
make build            # 프로덕션 빌드
make lint             # ESLint 검사
make lint-fix         # ESLint 자동 수정
make test             # 전체 테스트 실행
make test-coverage    # 커버리지 포함 테스트
make db:migrate       # DB 마이그레이션 (개발)
make db:migrate:prod  # DB 마이그레이션 (프로덕션)
make db:seed          # 시드 데이터 삽입
make db:reset         # DB 초기화 (주의: 전체 삭제 후 마이그레이션)
make db:studio        # Prisma Studio 실행
```

### npm scripts

```bash
npm run dev           # 개발 서버
npm run build         # 프로덕션 빌드
npm run lint          # ESLint
npm test              # Jest 테스트
npm run test:coverage # 커버리지
```

## API 문서

- 상세 명세: [`API.md`](./API.md)
- OpenAPI 스펙: [`openapi.yaml`](./openapi.yaml)
- 화면 정의서: [`SCREENS.md`](./SCREENS.md)
- ERD: [`ERD.md`](./ERD.md)

## 라이선스

Private
