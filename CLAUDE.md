# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Daily Sales Report System** (영업 일일 보고 시스템) — a greenfield project currently at the requirements/specification phase. No tech stack has been chosen yet and no source code exists.

## Requirements (from PROMPTS.md)

The system must support:

- **Visit Reports**: Sales staff log daily customer visits with visit content. Multiple visit entries per day per staff member are allowed.
- **Problem & Plan**: Each daily report includes a Problem section (current issues or consultations) and a Plan section (tasks for tomorrow). Supervisors can leave comments on Problems and Plans.
- **Master Data**: Customer master and Sales staff master records must be managed.

## Data Model (to be designed)

Key entities based on requirements:

- **SalesStaff** — sales staff master
- **Customer** — customer master
- **DailyReport** — one report per staff per day; contains Problem and Plan fields
- **VisitRecord** — many per DailyReport; references Customer
- **Comment** — supervisor comments attached to a DailyReport's Problem or Plan


 ## Project Documentation

  @ERD.md
  @SCREENS.md
  @API.md
  @TEST.md
  @openapi.yaml
  @prisma/schema.prisma


## Next Steps

When initializing the project, decide on:
1. Tech stack (e.g., Next.js + Prisma + PostgreSQL, or similar)
2. Authentication / role model (sales staff vs. supervisor roles)
3. ER diagram in Mermaid (as specified in PROMPTS.md)
