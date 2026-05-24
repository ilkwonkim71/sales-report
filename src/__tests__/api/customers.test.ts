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

import { GET as getCustomers, POST as createCustomer } from "@/app/api/v1/customers/route"
import { PUT as updateCustomer } from "@/app/api/v1/customers/[id]/route"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import type { AuthenticatedUser } from "@/types/auth"
import type { AuthedHandler } from "@/lib/withAuth"

// ── typed mock refs ───────────────────────────────────────────────────────────

const mockCustomerFindMany = prisma.customer.findMany as jest.MockedFunction<typeof prisma.customer.findMany>
const mockCustomerFindUnique = prisma.customer.findUnique as jest.MockedFunction<typeof prisma.customer.findUnique>
const mockCustomerCreate = prisma.customer.create as jest.MockedFunction<typeof prisma.customer.create>
const mockCustomerUpdate = prisma.customer.update as jest.MockedFunction<typeof prisma.customer.update>

// ── fixtures ──────────────────────────────────────────────────────────────────

const STAFF1: AuthenticatedUser = { id: 1, name: "Staff One", email: "staff1@test.com", role: "STAFF" }
const SUPER: AuthenticatedUser = { id: 3, name: "Super User", email: "super@test.com", role: "SUPERVISOR" }

const dbCustomer1 = {
  id: 1,
  companyName: "A주식회사",
  contactName: "김철수",
  phone: "02-1234-5678",
  address: "서울",
  createdAt: new Date("2026-01-01T00:00:00Z"),
}

const dbCustomer2 = {
  id: 2,
  companyName: "B코퍼레이션",
  contactName: "이영희",
  phone: "031-9876-5432",
  address: "경기",
  createdAt: new Date("2026-01-02T00:00:00Z"),
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

describe("GET /api/v1/customers", () => {
  it("CUS-001: 고객 목록 전체 조회 → 200, 배열 반환", async () => {
    mockCustomerFindMany.mockResolvedValue([dbCustomer1, dbCustomer2] as never)

    const res = await (getCustomers as AuthedHandler)(
      makeGETRequest("http://localhost/api/v1/customers"),
      STAFF1,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data).toHaveLength(2)
  })

  it("CUS-002: ?q= 파라미터로 company_name 검색 → 200, 필터된 결과 반환", async () => {
    mockCustomerFindMany.mockResolvedValue([dbCustomer1] as never)

    const res = await (getCustomers as AuthedHandler)(
      makeGETRequest("http://localhost/api/v1/customers?q=A주식회사"),
      STAFF1,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].company_name).toBe("A주식회사")
  })

  it("CUS-003: ?q= 파라미터로 contact_name 검색 → 200, 필터된 결과 반환", async () => {
    mockCustomerFindMany.mockResolvedValue([dbCustomer2] as never)

    const res = await (getCustomers as AuthedHandler)(
      makeGETRequest("http://localhost/api/v1/customers?q=이영희"),
      SUPER,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data[0].contact_name).toBe("이영희")
  })

  it("CUS-004: 고객이 없을 때 → 200, 빈 배열", async () => {
    mockCustomerFindMany.mockResolvedValue([] as never)

    const res = await (getCustomers as AuthedHandler)(
      makeGETRequest("http://localhost/api/v1/customers"),
      STAFF1,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual([])
  })
})

describe("POST /api/v1/customers", () => {
  it("CUS-005: STAFF가 고객 등록 → 403 FORBIDDEN", async () => {
    const res = await (createCustomer as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/customers", {
        company_name: "신규회사",
        contact_name: "홍길동",
      }),
      STAFF1,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error.code).toBe("FORBIDDEN")
  })

  it("CUS-006: company_name 누락 → 400 BAD_REQUEST", async () => {
    const res = await (createCustomer as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/customers", { contact_name: "홍길동" }),
      SUPER,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe("BAD_REQUEST")
  })

  it("CUS-007: contact_name 누락 → 400 BAD_REQUEST", async () => {
    const res = await (createCustomer as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/customers", { company_name: "신규회사" }),
      SUPER,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe("BAD_REQUEST")
  })

  it("CUS-008: SUPERVISOR 정상 고객 등록 → 201, 생성된 고객 반환", async () => {
    mockCustomerCreate.mockResolvedValue({
      ...dbCustomer1,
      id: 3,
      companyName: "신규회사",
      contactName: "홍길동",
    } as never)

    const res = await (createCustomer as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/customers", {
        company_name: "신규회사",
        contact_name: "홍길동",
        phone: "010-1234-5678",
        address: "부산",
      }),
      SUPER,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data.company_name).toBe("신규회사")
    expect(body.data.contact_name).toBe("홍길동")
  })
})

describe("PUT /api/v1/customers/:id", () => {
  it("CUS-009: STAFF가 고객 수정 → 403 FORBIDDEN", async () => {
    const res = await (updateCustomer as AuthedHandler)(
      makePUTRequest("http://localhost/api/v1/customers/1", { company_name: "수정회사" }),
      STAFF1,
      makeContext({ id: "1" })
    )
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error.code).toBe("FORBIDDEN")
  })

  it("CUS-010: 존재하지 않는 고객 수정 → 404 NOT_FOUND", async () => {
    mockCustomerFindUnique.mockResolvedValue(null)

    const res = await (updateCustomer as AuthedHandler)(
      makePUTRequest("http://localhost/api/v1/customers/999", { company_name: "수정회사" }),
      SUPER,
      makeContext({ id: "999" })
    )
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error.code).toBe("NOT_FOUND")
  })

  it("CUS-011: SUPERVISOR 정상 고객 수정 → 200, 수정된 고객 반환", async () => {
    mockCustomerFindUnique.mockResolvedValue({ id: 1 } as never)
    mockCustomerUpdate.mockResolvedValue({
      ...dbCustomer1,
      companyName: "수정된회사",
    } as never)

    const res = await (updateCustomer as AuthedHandler)(
      makePUTRequest("http://localhost/api/v1/customers/1", { company_name: "수정된회사" }),
      SUPER,
      makeContext({ id: "1" })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.company_name).toBe("수정된회사")
  })
})
