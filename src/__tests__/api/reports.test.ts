/**
 * @jest-environment node
 */

// ── mocks ────────────────────────────────────────────────────────────────────

jest.mock("@/lib/prisma", () => ({
  prisma: {
    salesStaff: {
      findUnique: jest.fn(),
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
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    comment: {
      findUnique: jest.fn(),
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

// ── imports ───────────────────────────────────────────────────────────────────

import { GET as getReports, POST as createReport } from "@/app/api/v1/reports/route"
import { GET as getReport, PUT as updateReport } from "@/app/api/v1/reports/[id]/route"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import type { AuthenticatedUser } from "@/types/auth"
import type { AuthedHandler } from "@/lib/withAuth"

// ── typed mock refs ───────────────────────────────────────────────────────────

const mockReportFindMany = prisma.dailyReport.findMany as jest.MockedFunction<typeof prisma.dailyReport.findMany>
const mockReportFindUnique = prisma.dailyReport.findUnique as jest.MockedFunction<typeof prisma.dailyReport.findUnique>
const mockReportCreate = prisma.dailyReport.create as jest.MockedFunction<typeof prisma.dailyReport.create>
const mockReportUpdate = prisma.dailyReport.update as jest.MockedFunction<typeof prisma.dailyReport.update>
const mockCustomerFindMany = prisma.customer.findMany as jest.MockedFunction<typeof prisma.customer.findMany>

// ── fixtures ──────────────────────────────────────────────────────────────────

const STAFF1: AuthenticatedUser = { id: 1, name: "Staff One", email: "staff1@test.com", role: "STAFF" }
const STAFF2: AuthenticatedUser = { id: 2, name: "Staff Two", email: "staff2@test.com", role: "STAFF" }
const SUPER: AuthenticatedUser = { id: 3, name: "Super User", email: "super@test.com", role: "SUPERVISOR" }

const TODAY = new Date().toISOString().split("T")[0]
const REPORT_DATE = new Date(TODAY)

const dbReportFull = {
  id: 10,
  salesStaffId: 1,
  reportDate: REPORT_DATE,
  problem: "과제1",
  plan: "계획1",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  salesStaff: { id: 1, name: "Staff One" },
  visitRecords: [
    {
      id: 100,
      customerId: 1,
      visitContent: "방문 내용1",
      customer: { id: 1, companyName: "A주식회사", contactName: "김철수" },
    },
  ],
  comments: [],
}

const dbReportList = {
  id: 10,
  salesStaffId: 1,
  reportDate: REPORT_DATE,
  problem: "과제1",
  plan: "계획1",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  salesStaff: { id: 1, name: "Staff One" },
  visitRecords: [{ id: 100 }],
}

// ── helpers ───────────────────────────────────────────────────────────────────

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

function makeContext(params: Record<string, string> = {}) {
  return { params: Promise.resolve(params) }
}

// ── tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  process.env.JWT_SECRET = "test-secret-at-least-32-chars-long!!"
})

describe("GET /api/v1/reports", () => {
  it("REP-001: STAFF 본인 보고서 목록 조회 → 200, 배열 반환", async () => {
    mockReportFindMany.mockResolvedValue([dbReportList] as never)

    const res = await (getReports as AuthedHandler)(
      makeGETRequest("http://localhost/api/v1/reports"),
      STAFF1,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data[0].id).toBe(10)
  })

  it("REP-002: SUPERVISOR 전체 보고서 목록 조회 → 200", async () => {
    mockReportFindMany.mockResolvedValue([dbReportList] as never)

    const res = await (getReports as AuthedHandler)(
      makeGETRequest("http://localhost/api/v1/reports"),
      SUPER,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it("REP-003: month 파라미터 유효성 검사 — 잘못된 형식 → 400", async () => {
    const res = await (getReports as AuthedHandler)(
      makeGETRequest("http://localhost/api/v1/reports?month=2026/01"),
      STAFF1,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe("BAD_REQUEST")
  })

  it("REP-004: SUPERVISOR staff_id 필터 — 잘못된 값 → 400", async () => {
    const res = await (getReports as AuthedHandler)(
      makeGETRequest("http://localhost/api/v1/reports?staff_id=abc"),
      SUPER,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe("BAD_REQUEST")
  })

  it("REP-005: 빈 목록 → 200, 빈 배열", async () => {
    mockReportFindMany.mockResolvedValue([] as never)

    const res = await (getReports as AuthedHandler)(
      makeGETRequest("http://localhost/api/v1/reports"),
      STAFF1,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual([])
  })
})

describe("POST /api/v1/reports", () => {
  const validBody = {
    report_date: TODAY,
    visits: [{ customer_id: 1, visit_content: "방문 내용" }],
    problem: "문제점",
    plan: "계획",
  }

  it("REP-006: visits 빈 배열 → 400 BAD_REQUEST", async () => {
    const res = await (createReport as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/reports", { ...validBody, visits: [] }),
      STAFF1,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe("BAD_REQUEST")
  })

  it("REP-007: SUPERVISOR가 보고서 생성 → 403 FORBIDDEN", async () => {
    const res = await (createReport as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/reports", validBody),
      SUPER,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error.code).toBe("FORBIDDEN")
  })

  it("REP-008: report_date 누락 → 400 BAD_REQUEST", async () => {
    const res = await (createReport as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/reports", { visits: [{ customer_id: 1, visit_content: "방문" }] }),
      STAFF1,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe("BAD_REQUEST")
  })

  it("REP-009: 중복 보고서 → 409 REPORT_ALREADY_EXISTS", async () => {
    mockReportFindUnique.mockResolvedValue({ id: 10, salesStaffId: 1 } as never)
    mockCustomerFindMany.mockResolvedValue([{ id: 1 }] as never)

    const res = await (createReport as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/reports", validBody),
      STAFF1,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error.code).toBe("REPORT_ALREADY_EXISTS")
  })

  it("REP-010: 존재하지 않는 customer_id → 400 CUSTOMER_NOT_FOUND", async () => {
    mockReportFindUnique.mockResolvedValue(null)
    mockCustomerFindMany.mockResolvedValue([] as never)

    const res = await (createReport as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/reports", validBody),
      STAFF1,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe("CUSTOMER_NOT_FOUND")
  })

  it("REP-011: 정상 보고서 생성 → 201, 생성된 보고서 반환", async () => {
    mockReportFindUnique.mockResolvedValue(null)
    mockCustomerFindMany.mockResolvedValue([{ id: 1 }] as never)
    mockReportCreate.mockResolvedValue({
      ...dbReportFull,
      id: 11,
    } as never)

    const res = await (createReport as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/reports", validBody),
      STAFF1,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data.id).toBe(11)
    expect(body.data.visits).toBeDefined()
  })
})

describe("GET /api/v1/reports/:id", () => {
  it("REP-012: 존재하지 않는 보고서 → 404 NOT_FOUND", async () => {
    mockReportFindUnique.mockResolvedValue(null)

    const res = await (getReport as AuthedHandler)(
      makeGETRequest("http://localhost/api/v1/reports/999"),
      STAFF1,
      makeContext({ id: "999" })
    )
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error.code).toBe("NOT_FOUND")
  })

  it("REP-013: 잘못된 id 형식 → 400 BAD_REQUEST", async () => {
    const res = await (getReport as AuthedHandler)(
      makeGETRequest("http://localhost/api/v1/reports/abc"),
      STAFF1,
      makeContext({ id: "abc" })
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe("BAD_REQUEST")
  })

  it("REP-014: STAFF 본인 보고서 조회 → 200", async () => {
    mockReportFindUnique.mockResolvedValue(dbReportFull as never)

    const res = await (getReport as AuthedHandler)(
      makeGETRequest("http://localhost/api/v1/reports/10"),
      STAFF1,
      makeContext({ id: "10" })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.id).toBe(10)
    expect(body.data.visits).toBeDefined()
    expect(body.data.comments).toBeDefined()
  })

  it("REP-015: STAFF가 타인 보고서 조회 → 403 FORBIDDEN", async () => {
    mockReportFindUnique.mockResolvedValue(dbReportFull as never)

    const res = await (getReport as AuthedHandler)(
      makeGETRequest("http://localhost/api/v1/reports/10"),
      STAFF2,
      makeContext({ id: "10" })
    )
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error.code).toBe("FORBIDDEN")
  })

  it("REP-016: SUPERVISOR 타인 보고서 조회 → 200 (접근 허용)", async () => {
    mockReportFindUnique.mockResolvedValue(dbReportFull as never)

    const res = await (getReport as AuthedHandler)(
      makeGETRequest("http://localhost/api/v1/reports/10"),
      SUPER,
      makeContext({ id: "10" })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.id).toBe(10)
  })
})

describe("PUT /api/v1/reports/:id", () => {
  it("REP-017: SUPERVISOR가 보고서 수정 → 403 FORBIDDEN", async () => {
    const res = await (updateReport as AuthedHandler)(
      makePUTRequest("http://localhost/api/v1/reports/10", { problem: "수정됨" }),
      SUPER,
      makeContext({ id: "10" })
    )
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error.code).toBe("FORBIDDEN")
  })

  it("REP-018: 존재하지 않는 보고서 수정 → 404 NOT_FOUND", async () => {
    mockReportFindUnique.mockResolvedValue(null)

    const res = await (updateReport as AuthedHandler)(
      makePUTRequest("http://localhost/api/v1/reports/999", { problem: "수정됨" }),
      STAFF1,
      makeContext({ id: "999" })
    )
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error.code).toBe("NOT_FOUND")
  })

  it("REP-019: 정상 보고서 수정 → 200, 수정된 필드 반환", async () => {
    mockReportFindUnique.mockResolvedValue({ id: 10, salesStaffId: 1 } as never)
    mockReportUpdate.mockResolvedValue({
      id: 10,
      problem: "수정된 문제점",
      plan: "계획1",
      updatedAt: new Date("2026-01-02T00:00:00Z"),
    } as never)

    const res = await (updateReport as AuthedHandler)(
      makePUTRequest("http://localhost/api/v1/reports/10", { problem: "수정된 문제점" }),
      STAFF1,
      makeContext({ id: "10" })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.problem).toBe("수정된 문제점")
    expect(body.data.updated_at).toBeDefined()
  })

  it("REP-020: STAFF가 타인 보고서 수정 → 403 FORBIDDEN", async () => {
    mockReportFindUnique.mockResolvedValue({ id: 10, salesStaffId: 1 } as never)

    const res = await (updateReport as AuthedHandler)(
      makePUTRequest("http://localhost/api/v1/reports/10", { problem: "수정됨" }),
      STAFF2,
      makeContext({ id: "10" })
    )
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error.code).toBe("FORBIDDEN")
  })

  it("REP-021: 잘못된 id 형식 → 400 BAD_REQUEST", async () => {
    const res = await (updateReport as AuthedHandler)(
      makePUTRequest("http://localhost/api/v1/reports/xyz", { problem: "수정됨" }),
      STAFF1,
      makeContext({ id: "xyz" })
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe("BAD_REQUEST")
  })
})
