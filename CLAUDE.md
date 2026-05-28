# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**영업 일일 보고 시스템 (Daily Sales Report System)** — 구현 완료, 유지보수 단계.

- 영업사원이 일일 고객 방문 기록을 작성하고, 수퍼바이저가 열람/코멘트
- Vercel에 배포 중 (master 브랜치 자동 배포)

## Tech Stack

| 영역 | 기술 |
|------|------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Database | PostgreSQL + Prisma 7 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| CSS | Tailwind CSS v4 + `@tailwindcss/postcss` |
| Testing | Jest + React Testing Library |
| Deployment | Vercel |

## Project Structure

```
src/
  app/
    (auth)/login/          # 로그인 페이지
    (main)/                # 인증 필요 레이아웃
      reports/             # 보고서 목록/작성/상세/편집
      customers/           # 고객 마스터 CRUD
      staff/               # 영업사원 마스터 CRUD (SUPERVISOR 전용)
    api/v1/                # REST API 라우트
      auth/login|logout
      reports/[id]/visits|comments
      customers/[id]
      staff/[id]
  components/              # ReportForm, CustomerForm, StaffForm, StatusBadge
  contexts/AuthContext.tsx  # 전역 인증 상태
  lib/                     # prisma, jwt, withAuth, api-client, env, tokenBlacklist
  types/                   # API/도메인 타입 정의
prisma/schema.prisma        # DB 스키마
postcss.config.js           # @tailwindcss/postcss 설정 (필수)
```

## Data Model

```
SalesStaff   — 영업사원 (role: STAFF | SUPERVISOR)
Customer     — 고객사
DailyReport  — 일일 보고서 (salesStaffId + reportDate 유니크)
  ├── VisitRecord[]  — 방문 기록 (Customer 참조)
  └── Comment[]      — 수퍼바이저 코멘트 (target: PROBLEM | PLAN)
```

## Auth

- JWT 쿠키 기반 (`token` 쿠키, httpOnly)
- `src/lib/withAuth.ts` — API 라우트 인증 미들웨어
- `src/lib/tokenBlacklist.ts` — 로그아웃 시 토큰 무효화 (인메모리)
- 역할: `STAFF`(자신의 보고서만), `SUPERVISOR`(전체 열람 + 영업사원 관리)

## Key Commands

```bash
npm run dev          # 개발 서버
npm run build        # 프로덕션 빌드 (prisma generate 포함)
npm run test         # Jest 테스트
npm run lint         # ESLint
```

## Environment Variables

`.env` 파일 필요:
```
DATABASE_URL=
JWT_SECRET=
```

## CSS 주의사항

- `postcss.config.js`와 `@tailwindcss/postcss`(dependencies) 둘 다 필수
- `globals.css`는 `@import "tailwindcss";` 한 줄만 사용

## Reference Docs

- @ERD.md — ER 다이어그램
- @SCREENS.md — 화면 설계
- @API.md — API 명세
- @TEST.md — 테스트 전략
- @openapi.yaml — OpenAPI 스펙
- @prisma/schema.prisma — DB 스키마
