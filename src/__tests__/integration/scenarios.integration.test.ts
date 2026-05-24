/**
 * @jest-environment node
 *
 * 통합 시나리오 테스트 — Prisma 완전 모킹, 단계별 상태 공유
 *
 * SCN-001: 영업사원 일일 업무 흐름 (6단계)
 * SCN-002: 상급자 검토 흐름 (6단계)
 * SCN-003: 권한 격리 (5단계)
 */

// ── mocks ────────────────────────────────────────────────────────────────────

jest.mock("@/lib/prisma", () => ({
  prisma: {
    salesStaff: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    dailyReport: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    visitRecord: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    comment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

jest.mock("@/lib/withAuth", () => ({
  withAuth: jest.fn((handler: unknown) => handler),
}))

jest.mock("bcryptjs", () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue("$2b$10$hashedpassword"),
}))

jest.mock("@/lib/jwt", () => ({
  signToken: jest.fn().mockReturnValue("mock.jwt.token"),
  verifyToken: jest.fn(),
}))

jest.mock("@/lib/tokenBlacklist", () => ({
  isBlacklisted: jest.fn().mockReturnValue(false),
  addToBlacklist: jest.fn(),
}))

// ── imports ───────────────────────────────────────────────────────────────────

import { POST as loginPOST } from "@/app/api/v1/auth/login/route"
import { GET as getReports, POST as createReport } from "@/app/api/v1/reports/route"
import { GET as getReport, PUT as updateReport } from "@/app/api/v1/reports/[id]/route"
import { POST as createVisit } from "@/app/api/v1/reports/[id]/visits/route"
import { DELETE as deleteVisit } from "@/app/api/v1/reports/[id]/visits/[visitId]/route"
import { POST as createComment } from "@/app/api/v1/reports/[id]/comments/route"
import { POST as createCustomer } from "@/app/api/v1/customers/route"
import { GET as getStaffList } from "@/app/api/v1/staff/route"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import type { AuthenticatedUser } from "@/types/auth"
import type { AuthedHandler } from "@/lib/withAuth"

// ── typed mock refs ───────────────────────────────────────────────────────────

const mockStaffFindUnique = prisma.salesStaff.findUnique as jest.MockedFunction<typeof prisma.salesStaff.findUnique>
const mockReportFindUnique = prisma.dailyReport.findUnique as jest.MockedFunction<typeof prisma.dailyReport.findUnique>
const mockReportFindMany = prisma.dailyReport.findMany as jest.MockedFunction<typeof prisma.dailyReport.findMany>
const mockReportCreate = prisma.dailyReport.create as jest.MockedFunction<typeof prisma.dailyReport.create>
const mockReportUpdate = prisma.dailyReport.update as jest.MockedFunction<typeof prisma.dailyReport.update>
const mockVisitFindFirst = prisma.visitRecord.findFirst as jest.MockedFunction<typeof prisma.visitRecord.findFirst>
const mockVisitCreate = prisma.visitRecord.create as jest.MockedFunction<typeof prisma.visitRecord.create>
const mockVisitDelete = prisma.visitRecord.delete as jest.MockedFunction<typeof prisma.visitRecord.delete>
const mockVisitCount = prisma.visitRecord.count as jest.MockedFunction<typeof prisma.visitRecord.count>
const mockCustomerFindMany = prisma.customer.findMany as jest.MockedFunction<typeof prisma.customer.findMany>
const mockCustomerFindUnique = prisma.customer.findUnique as jest.MockedFunction<typeof prisma.customer.findUnique>
// mockCommentFindFirst omitted - not used in current scenarios
const mockCommentCreate = prisma.comment.create as jest.MockedFunction<typeof prisma.comment.create>

// ── fixtures ──────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split("T")[0]
const REPORT_DATE = new Date(TODAY)

const STAFF1: AuthenticatedUser = { id: 1, name: "Staff One", email: "staff1@test.com", role: "STAFF" }
// STAFF2 fixture used via STAFF1 isolation scenarios
const SUPER: AuthenticatedUser = { id: 3, name: "Super User", email: "super@test.com", role: "SUPERVISOR" }

const dbStaffRow = {
  id: 1,
  name: "Staff One",
  email: "staff1@test.com",
  password: "$2b$10$hashedpassword",
  role: "STAFF" as const,
  department: "영업1팀",
  createdAt: new Date(),
}

const dbCustomer1 = { id: 1, companyName: "A주식회사", contactName: "김철수" }
const dbCustomer2 = { id: 2, companyName: "B코퍼레이션", contactName: "이영희" }

// ── helpers ───────────────────────────────────────────────────────────────────

function makeLoginRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeGETRequest(url: string): NextRequest {
  return new NextRequest(url, { method: "GET" })
}

function makePOSTRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makePUTRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeDELETERequest(url: string): NextRequest {
  return new NextRequest(url, { method: "DELETE" })
}

function makeContext(params: Record<string, string> = {}) {
  return { params: Promise.resolve(params) }
}

// ── SCN-001: 영업사원 일일 업무 흐름 ─────────────────────────────────────────

describe("SCN-001: 영업사원 일일 업무 흐름", () => {
  // 시나리오 전체에서 공유되는 상태
  let token: string
  let reportId: number
  let newVisitId: number

  const dbReportFull = {
    id: 10,
    salesStaffId: 1,
    reportDate: REPORT_DATE,
    problem: "초기 문제점",
    plan: "초기 계획",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    salesStaff: { id: 1, name: "Staff One" },
    visitRecords: [
      {
        id: 101,
        customerId: 1,
        visitContent: "첫 번째 방문",
        customer: dbCustomer1,
      },
      {
        id: 102,
        customerId: 2,
        visitContent: "두 번째 방문",
        customer: dbCustomer2,
      },
    ],
    comments: [],
  }

  beforeAll(() => {
    jest.clearAllMocks()
    process.env.JWT_SECRET = "test-secret-at-least-32-chars-long!!"
    mockStaffFindUnique.mockResolvedValue(dbStaffRow as never)
  })

  it("SCN-001-1: staff1 로그인 → 200, token 획득", async () => {
    const res = await loginPOST(
      makeLoginRequest({ email: "staff1@test.com", password: "password" })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.token).toBeDefined()
    token = body.data.token
  })

  it("SCN-001-2: 보고서 생성 POST /reports (visits 2건) → 201, reportId 획득", async () => {
    mockReportFindUnique.mockResolvedValue(null)
    mockCustomerFindMany.mockResolvedValue([dbCustomer1, dbCustomer2] as never)
    mockReportCreate.mockResolvedValue(dbReportFull as never)

    const res = await (createReport as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/reports", {
        report_date: TODAY,
        visits: [
          { customer_id: 1, visit_content: "첫 번째 방문" },
          { customer_id: 2, visit_content: "두 번째 방문" },
        ],
        problem: "초기 문제점",
        plan: "초기 계획",
      }),
      STAFF1,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data.id).toBeDefined()
    expect(body.data.visits).toHaveLength(2)
    reportId = body.data.id
  })

  it("SCN-001-3: 방문 기록 추가 POST /reports/:id/visits → 201, visitId 획득", async () => {
    const dbReport = { id: reportId, salesStaffId: 1 }
    const newVisit = {
      id: 103,
      dailyReportId: reportId,
      customerId: 1,
      visitContent: "추가 방문",
      customer: dbCustomer1,
    }

    mockReportFindUnique.mockResolvedValue(dbReport as never)
    mockCustomerFindUnique.mockResolvedValue(dbCustomer1 as never)
    mockVisitCreate.mockResolvedValue(newVisit as never)

    const res = await (createVisit as AuthedHandler)(
      makePOSTRequest(`http://localhost/api/v1/reports/${reportId}/visits`, {
        customer_id: 1,
        visit_content: "추가 방문",
      }),
      STAFF1,
      makeContext({ id: String(reportId) })
    )
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data.id).toBeDefined()
    newVisitId = body.data.id
  })

  it("SCN-001-4: 방문 기록 삭제 DELETE /reports/:id/visits/:visitId → 200", async () => {
    const dbReport = { id: reportId, salesStaffId: 1 }
    const visitToDelete = { id: newVisitId, dailyReportId: reportId }

    mockReportFindUnique.mockResolvedValue(dbReport as never)
    mockVisitFindFirst.mockResolvedValue(visitToDelete as never)
    mockVisitCount.mockResolvedValue(3)
    mockVisitDelete.mockResolvedValue(visitToDelete as never)

    const res = await (deleteVisit as AuthedHandler)(
      makeDELETERequest(`http://localhost/api/v1/reports/${reportId}/visits/${newVisitId}`),
      STAFF1,
      makeContext({ id: String(reportId), visitId: String(newVisitId) })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ data: null })
  })

  it("SCN-001-5: problem 수정 PUT /reports/:id → 200, 수정된 problem 확인", async () => {
    mockReportFindUnique.mockResolvedValue({ id: reportId, salesStaffId: 1 } as never)
    mockReportUpdate.mockResolvedValue({
      id: reportId,
      problem: "수정된 문제점",
      plan: "초기 계획",
      updatedAt: new Date("2026-01-02T00:00:00Z"),
    } as never)

    const res = await (updateReport as AuthedHandler)(
      makePUTRequest(`http://localhost/api/v1/reports/${reportId}`, {
        problem: "수정된 문제점",
      }),
      STAFF1,
      makeContext({ id: String(reportId) })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.problem).toBe("수정된 문제점")
  })

  it("SCN-001-6: 보고서 상세 조회 GET /reports/:id → visits 2건, 수정된 problem 확인", async () => {
    const updatedReport = {
      ...dbReportFull,
      problem: "수정된 문제점",
    }
    mockReportFindUnique.mockResolvedValue(updatedReport as never)

    const res = await (getReport as AuthedHandler)(
      makeGETRequest(`http://localhost/api/v1/reports/${reportId}`),
      STAFF1,
      makeContext({ id: String(reportId) })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.visits).toHaveLength(2)
    expect(body.data.problem).toBe("수정된 문제점")
  })

  it("token이 획득되었음을 검증 (SCN-001-1 의존성 검사)", () => {
    expect(token).toBeDefined()
    expect(typeof token).toBe("string")
  })
})

// ── SCN-002: 상급자 검토 흐름 ────────────────────────────────────────────────

describe("SCN-002: 상급자 검토 흐름", () => {
  const dbSuperRow = {
    id: 3,
    name: "Super User",
    email: "super@test.com",
    password: "$2b$10$hashedpassword",
    role: "SUPERVISOR" as const,
    department: "영업관리팀",
    createdAt: new Date(),
  }

  const dbReportWithComments = {
    id: 10,
    salesStaffId: 1,
    reportDate: REPORT_DATE,
    problem: "문제점",
    plan: "계획",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    salesStaff: { id: 1, name: "Staff One" },
    visitRecords: [
      {
        id: 101,
        customerId: 1,
        visitContent: "방문 내용",
        customer: dbCustomer1,
      },
    ],
    comments: [
      {
        id: 201,
        targetType: "PROBLEM" as const,
        content: "문제점 피드백",
        createdAt: new Date(),
        author: { id: 3, name: "Super User" },
      },
      {
        id: 202,
        targetType: "PLAN" as const,
        content: "계획 피드백",
        createdAt: new Date(),
        author: { id: 3, name: "Super User" },
      },
    ],
  }

  const dbReportList = [
    {
      id: 10,
      salesStaffId: 1,
      reportDate: REPORT_DATE,
      problem: "문제점",
      plan: "계획",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
      salesStaff: { id: 1, name: "Staff One" },
      visitRecords: [{ id: 101 }],
    },
  ]

  beforeAll(() => {
    jest.clearAllMocks()
    process.env.JWT_SECRET = "test-secret-at-least-32-chars-long!!"
    mockStaffFindUnique.mockResolvedValue(dbSuperRow as never)
  })

  it("SCN-002-1: super 로그인 → 200, token 획득", async () => {
    const res = await loginPOST(
      makeLoginRequest({ email: "super@test.com", password: "password" })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.user.role).toBe("SUPERVISOR")
    expect(body.data.token).toBeDefined()
  })

  it("SCN-002-2: GET /reports (전체 목록) → 200, 배열 반환", async () => {
    mockReportFindMany.mockResolvedValue(dbReportList as never)

    const res = await (getReports as AuthedHandler)(
      makeGETRequest("http://localhost/api/v1/reports"),
      SUPER,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThan(0)
  })

  it("SCN-002-3: GET /reports/:id (staff1 보고서) → 200", async () => {
    mockReportFindUnique.mockResolvedValue(dbReportWithComments as never)

    const res = await (getReport as AuthedHandler)(
      makeGETRequest("http://localhost/api/v1/reports/10"),
      SUPER,
      makeContext({ id: "10" })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.id).toBe(10)
  })

  it("SCN-002-4: POST /reports/:id/comments (PROBLEM) → 201", async () => {
    mockReportFindUnique.mockResolvedValue({ id: 10 } as never)
    mockCommentCreate.mockResolvedValue({
      id: 201,
      dailyReportId: 10,
      authorId: 3,
      targetType: "PROBLEM" as const,
      content: "문제점 피드백",
      createdAt: new Date(),
      author: { id: 3, name: "Super User" },
    } as never)

    const res = await (createComment as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/reports/10/comments", {
        target_type: "PROBLEM",
        content: "문제점 피드백",
      }),
      SUPER,
      makeContext({ id: "10" })
    )
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data.target_type).toBe("PROBLEM")
  })

  it("SCN-002-5: POST /reports/:id/comments (PLAN) → 201", async () => {
    mockReportFindUnique.mockResolvedValue({ id: 10 } as never)
    mockCommentCreate.mockResolvedValue({
      id: 202,
      dailyReportId: 10,
      authorId: 3,
      targetType: "PLAN" as const,
      content: "계획 피드백",
      createdAt: new Date(),
      author: { id: 3, name: "Super User" },
    } as never)

    const res = await (createComment as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/reports/10/comments", {
        target_type: "PLAN",
        content: "계획 피드백",
      }),
      SUPER,
      makeContext({ id: "10" })
    )
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data.target_type).toBe("PLAN")
  })

  it("SCN-002-6: GET /reports/:id → comments 2건 포함", async () => {
    mockReportFindUnique.mockResolvedValue(dbReportWithComments as never)

    const res = await (getReport as AuthedHandler)(
      makeGETRequest("http://localhost/api/v1/reports/10"),
      SUPER,
      makeContext({ id: "10" })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.comments).toHaveLength(2)
    const targetTypes = body.data.comments.map((c: { target_type: string }) => c.target_type)
    expect(targetTypes).toContain("PROBLEM")
    expect(targetTypes).toContain("PLAN")
  })
})

// ── SCN-003: 권한 격리 ────────────────────────────────────────────────────────

describe("SCN-003: 권한 격리", () => {
  const dbStaff2Report = {
    id: 20,
    salesStaffId: 2,
    reportDate: REPORT_DATE,
    problem: "staff2 문제점",
    plan: "staff2 계획",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    salesStaff: { id: 2, name: "Staff Two" },
    visitRecords: [{ id: 200, customerId: 1, visitContent: "방문", customer: dbCustomer1 }],
    comments: [],
  }

  beforeAll(() => {
    jest.clearAllMocks()
    process.env.JWT_SECRET = "test-secret-at-least-32-chars-long!!"
    mockStaffFindUnique.mockResolvedValue(dbStaffRow as never)
  })

  it("SCN-003-1: staff1 로그인 성공 → 200", async () => {
    const res = await loginPOST(
      makeLoginRequest({ email: "staff1@test.com", password: "password" })
    )

    expect(res.status).toBe(200)
  })

  it("SCN-003-2: staff2 보고서 GET → 403 FORBIDDEN", async () => {
    mockReportFindUnique.mockResolvedValue(dbStaff2Report as never)

    const res = await (getReport as AuthedHandler)(
      makeGETRequest("http://localhost/api/v1/reports/20"),
      STAFF1,
      makeContext({ id: "20" })
    )
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error.code).toBe("FORBIDDEN")
  })

  it("SCN-003-3: staff2 보고서 visits POST → 403 FORBIDDEN", async () => {
    mockReportFindUnique.mockResolvedValue({ id: 20, salesStaffId: 2 } as never)

    const res = await (createVisit as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/reports/20/visits", {
        customer_id: 1,
        visit_content: "무단 방문",
      }),
      STAFF1,
      makeContext({ id: "20" })
    )
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error.code).toBe("FORBIDDEN")
  })

  it("SCN-003-4: 고객 등록 POST /customers → 403 FORBIDDEN (STAFF 권한 없음)", async () => {
    const res = await (createCustomer as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/customers", {
        company_name: "무단회사",
        contact_name: "무단담당자",
      }),
      STAFF1,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error.code).toBe("FORBIDDEN")
  })

  it("SCN-003-5: 영업사원 목록 GET /staff → 403 FORBIDDEN (STAFF 권한 없음)", async () => {
    const res = await (getStaffList as AuthedHandler)(
      makeGETRequest("http://localhost/api/v1/staff"),
      STAFF1,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error.code).toBe("FORBIDDEN")
  })
})
