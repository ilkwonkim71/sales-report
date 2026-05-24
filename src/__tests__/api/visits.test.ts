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

// ── imports ───────────────────────────────────────────────────────────────────

import { POST as createVisit } from "@/app/api/v1/reports/[id]/visits/route"
import { PUT as updateVisit, DELETE as deleteVisit } from "@/app/api/v1/reports/[id]/visits/[visitId]/route"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import type { AuthenticatedUser } from "@/types/auth"
import type { AuthedHandler } from "@/lib/withAuth"

// ── typed mock refs ───────────────────────────────────────────────────────────

const mockReportFindUnique = prisma.dailyReport.findUnique as jest.MockedFunction<typeof prisma.dailyReport.findUnique>
const mockVisitFindFirst = prisma.visitRecord.findFirst as jest.MockedFunction<typeof prisma.visitRecord.findFirst>
const mockVisitCreate = prisma.visitRecord.create as jest.MockedFunction<typeof prisma.visitRecord.create>
const mockVisitUpdate = prisma.visitRecord.update as jest.MockedFunction<typeof prisma.visitRecord.update>
const mockVisitDelete = prisma.visitRecord.delete as jest.MockedFunction<typeof prisma.visitRecord.delete>
const mockVisitCount = prisma.visitRecord.count as jest.MockedFunction<typeof prisma.visitRecord.count>
const mockCustomerFindUnique = prisma.customer.findUnique as jest.MockedFunction<typeof prisma.customer.findUnique>

// ── fixtures ──────────────────────────────────────────────────────────────────

const STAFF1: AuthenticatedUser = { id: 1, name: "Staff One", email: "staff1@test.com", role: "STAFF" }
const STAFF2: AuthenticatedUser = { id: 2, name: "Staff Two", email: "staff2@test.com", role: "STAFF" }
const SUPER: AuthenticatedUser = { id: 3, name: "Super User", email: "super@test.com", role: "SUPERVISOR" }

const dbReport = { id: 10, salesStaffId: 1 }
const dbCustomer = { id: 1, companyName: "A주식회사", contactName: "김철수" }
const dbVisit = {
  id: 100,
  dailyReportId: 10,
  customerId: 1,
  visitContent: "방문 내용",
  customer: dbCustomer,
}

// ── helpers ───────────────────────────────────────────────────────────────────

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

// ── tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  process.env.JWT_SECRET = "test-secret-at-least-32-chars-long!!"
})

describe("POST /api/v1/reports/:id/visits", () => {
  it("VIS-001: SUPERVISOR가 방문 기록 추가 → 403 FORBIDDEN", async () => {
    const res = await (createVisit as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/reports/10/visits", { customer_id: 1, visit_content: "방문" }),
      SUPER,
      makeContext({ id: "10" })
    )
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error.code).toBe("FORBIDDEN")
  })

  it("VIS-002: 존재하지 않는 보고서 → 404 NOT_FOUND", async () => {
    mockReportFindUnique.mockResolvedValue(null)

    const res = await (createVisit as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/reports/999/visits", { customer_id: 1, visit_content: "방문" }),
      STAFF1,
      makeContext({ id: "999" })
    )
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error.code).toBe("NOT_FOUND")
  })

  it("VIS-003: STAFF가 타인 보고서에 방문 기록 추가 → 403 FORBIDDEN", async () => {
    mockReportFindUnique.mockResolvedValue(dbReport as never)

    const res = await (createVisit as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/reports/10/visits", { customer_id: 1, visit_content: "방문" }),
      STAFF2,
      makeContext({ id: "10" })
    )
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error.code).toBe("FORBIDDEN")
  })

  it("VIS-004: 존재하지 않는 customer_id → 400 CUSTOMER_NOT_FOUND", async () => {
    mockReportFindUnique.mockResolvedValue(dbReport as never)
    mockCustomerFindUnique.mockResolvedValue(null)

    const res = await (createVisit as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/reports/10/visits", { customer_id: 999, visit_content: "방문" }),
      STAFF1,
      makeContext({ id: "10" })
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe("CUSTOMER_NOT_FOUND")
  })

  it("VIS-005: 정상 방문 기록 추가 → 201, 생성된 방문 기록 반환", async () => {
    mockReportFindUnique.mockResolvedValue(dbReport as never)
    mockCustomerFindUnique.mockResolvedValue(dbCustomer as never)
    mockVisitCreate.mockResolvedValue(dbVisit as never)

    const res = await (createVisit as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/reports/10/visits", { customer_id: 1, visit_content: "방문 내용" }),
      STAFF1,
      makeContext({ id: "10" })
    )
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data.id).toBe(100)
    expect(body.data.visit_content).toBe("방문 내용")
    expect(body.data.customer).toBeDefined()
  })
})

describe("DELETE /api/v1/reports/:id/visits/:visitId", () => {
  it("VIS-006: 마지막 방문 기록 삭제 → 400 LAST_VISIT_CANNOT_DELETE", async () => {
    mockReportFindUnique.mockResolvedValue(dbReport as never)
    mockVisitFindFirst.mockResolvedValue(dbVisit as never)
    mockVisitCount.mockResolvedValue(1)

    const res = await (deleteVisit as AuthedHandler)(
      makeDELETERequest("http://localhost/api/v1/reports/10/visits/100"),
      STAFF1,
      makeContext({ id: "10", visitId: "100" })
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe("LAST_VISIT_CANNOT_DELETE")
  })

  it("VIS-007: 존재하지 않는 방문 기록 삭제 → 404 NOT_FOUND", async () => {
    mockReportFindUnique.mockResolvedValue(dbReport as never)
    mockVisitFindFirst.mockResolvedValue(null)

    const res = await (deleteVisit as AuthedHandler)(
      makeDELETERequest("http://localhost/api/v1/reports/10/visits/999"),
      STAFF1,
      makeContext({ id: "10", visitId: "999" })
    )
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error.code).toBe("NOT_FOUND")
  })

  it("VIS-008: 정상 방문 기록 삭제 → 200 { data: null }", async () => {
    mockReportFindUnique.mockResolvedValue(dbReport as never)
    mockVisitFindFirst.mockResolvedValue(dbVisit as never)
    mockVisitCount.mockResolvedValue(3)
    mockVisitDelete.mockResolvedValue(dbVisit as never)

    const res = await (deleteVisit as AuthedHandler)(
      makeDELETERequest("http://localhost/api/v1/reports/10/visits/100"),
      STAFF1,
      makeContext({ id: "10", visitId: "100" })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ data: null })
  })

  it("VIS-009: SUPERVISOR가 방문 기록 삭제 → 403 FORBIDDEN", async () => {
    const res = await (deleteVisit as AuthedHandler)(
      makeDELETERequest("http://localhost/api/v1/reports/10/visits/100"),
      SUPER,
      makeContext({ id: "10", visitId: "100" })
    )
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error.code).toBe("FORBIDDEN")
  })
})

describe("PUT /api/v1/reports/:id/visits/:visitId", () => {
  it("방문 기록 수정 성공 → 200, 수정된 방문 기록 반환", async () => {
    mockReportFindUnique.mockResolvedValue(dbReport as never)
    mockVisitFindFirst.mockResolvedValue(dbVisit as never)
    mockCustomerFindUnique.mockResolvedValue(dbCustomer as never)
    mockVisitUpdate.mockResolvedValue({
      ...dbVisit,
      visitContent: "수정된 방문 내용",
    } as never)

    const res = await (updateVisit as AuthedHandler)(
      makePUTRequest("http://localhost/api/v1/reports/10/visits/100", { visit_content: "수정된 방문 내용" }),
      STAFF1,
      makeContext({ id: "10", visitId: "100" })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.visit_content).toBe("수정된 방문 내용")
  })

  it("SUPERVISOR가 방문 기록 수정 → 403 FORBIDDEN", async () => {
    const res = await (updateVisit as AuthedHandler)(
      makePUTRequest("http://localhost/api/v1/reports/10/visits/100", { visit_content: "수정" }),
      SUPER,
      makeContext({ id: "10", visitId: "100" })
    )
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error.code).toBe("FORBIDDEN")
  })
})
