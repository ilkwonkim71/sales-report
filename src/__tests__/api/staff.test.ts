/**
 * @jest-environment node
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
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue("$2b$10$hashedpassword"),
}))

// ── imports ───────────────────────────────────────────────────────────────────

import { GET as getStaffList, POST as createStaff } from "@/app/api/v1/staff/route"
import { PUT as updateStaff } from "@/app/api/v1/staff/[id]/route"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import type { AuthenticatedUser } from "@/types/auth"
import type { AuthedHandler } from "@/lib/withAuth"

// ── typed mock refs ───────────────────────────────────────────────────────────

const mockStaffFindMany = prisma.salesStaff.findMany as jest.MockedFunction<typeof prisma.salesStaff.findMany>
const mockStaffFindUnique = prisma.salesStaff.findUnique as jest.MockedFunction<typeof prisma.salesStaff.findUnique>
const mockStaffFindFirst = prisma.salesStaff.findFirst as jest.MockedFunction<typeof prisma.salesStaff.findFirst>
const mockStaffCreate = prisma.salesStaff.create as jest.MockedFunction<typeof prisma.salesStaff.create>
const mockStaffUpdate = prisma.salesStaff.update as jest.MockedFunction<typeof prisma.salesStaff.update>

// ── fixtures ──────────────────────────────────────────────────────────────────

const STAFF1: AuthenticatedUser = { id: 1, name: "Staff One", email: "staff1@test.com", role: "STAFF" }
const SUPER: AuthenticatedUser = { id: 3, name: "Super User", email: "super@test.com", role: "SUPERVISOR" }

const dbStaff1 = {
  id: 1,
  name: "Staff One",
  email: "staff1@test.com",
  role: "STAFF" as const,
  department: "영업1팀",
  createdAt: new Date("2026-01-01T00:00:00Z"),
}

const dbStaff2 = {
  id: 2,
  name: "Staff Two",
  email: "staff2@test.com",
  role: "STAFF" as const,
  department: "영업2팀",
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

describe("GET /api/v1/staff", () => {
  it("STF-001: STAFF가 영업사원 목록 조회 → 403 FORBIDDEN", async () => {
    const res = await (getStaffList as AuthedHandler)(
      makeGETRequest("http://localhost/api/v1/staff"),
      STAFF1,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error.code).toBe("FORBIDDEN")
  })

  it("STF-002: SUPERVISOR 영업사원 목록 조회 → 200, 배열 반환", async () => {
    mockStaffFindMany.mockResolvedValue([dbStaff1, dbStaff2] as never)

    const res = await (getStaffList as AuthedHandler)(
      makeGETRequest("http://localhost/api/v1/staff"),
      SUPER,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data).toHaveLength(2)
  })

  it("STF-003: ?q= 파라미터로 이름 검색 → 200, 필터된 결과 반환", async () => {
    mockStaffFindMany.mockResolvedValue([dbStaff1] as never)

    const res = await (getStaffList as AuthedHandler)(
      makeGETRequest("http://localhost/api/v1/staff?q=Staff One"),
      SUPER,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].name).toBe("Staff One")
  })

  it("STF-004: 빈 목록 → 200, 빈 배열", async () => {
    mockStaffFindMany.mockResolvedValue([] as never)

    const res = await (getStaffList as AuthedHandler)(
      makeGETRequest("http://localhost/api/v1/staff"),
      SUPER,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual([])
  })
})

describe("POST /api/v1/staff", () => {
  const validBody = {
    name: "신규직원",
    email: "newstaff@test.com",
    password: "securepassword",
    role: "STAFF",
    department: "영업3팀",
  }

  it("STF-005: 중복 이메일 → 409 EMAIL_ALREADY_EXISTS", async () => {
    mockStaffFindUnique.mockResolvedValue({ id: 99 } as never)

    const res = await (createStaff as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/staff", validBody),
      SUPER,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error.code).toBe("EMAIL_ALREADY_EXISTS")
  })

  it("STF-006: STAFF가 영업사원 등록 → 403 FORBIDDEN", async () => {
    const res = await (createStaff as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/staff", validBody),
      STAFF1,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error.code).toBe("FORBIDDEN")
  })

  it("STF-007: name 누락 → 400 BAD_REQUEST", async () => {
    const res = await (createStaff as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/staff", { email: "newstaff@test.com", password: "pw" }),
      SUPER,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe("BAD_REQUEST")
  })

  it("STF-008: email 누락 → 400 BAD_REQUEST", async () => {
    const res = await (createStaff as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/staff", { name: "신규직원", password: "pw" }),
      SUPER,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe("BAD_REQUEST")
  })

  it("STF-009: password 누락 → 400 BAD_REQUEST", async () => {
    const res = await (createStaff as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/staff", { name: "신규직원", email: "newstaff@test.com" }),
      SUPER,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe("BAD_REQUEST")
  })

  it("STF-010: SUPERVISOR 정상 영업사원 등록 → 201, password 필드 없음", async () => {
    mockStaffFindUnique.mockResolvedValue(null)
    mockStaffCreate.mockResolvedValue({
      id: 10,
      name: "신규직원",
      email: "newstaff@test.com",
      role: "STAFF" as const,
      department: "영업3팀",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    } as never)

    const res = await (createStaff as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/staff", validBody),
      SUPER,
      makeContext()
    )
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data.name).toBe("신규직원")
    expect(body.data.email).toBe("newstaff@test.com")
    expect(body.data).not.toHaveProperty("password")
  })
})

describe("PUT /api/v1/staff/:id", () => {
  it("STF-011: STAFF가 영업사원 수정 → 403 FORBIDDEN", async () => {
    const res = await (updateStaff as AuthedHandler)(
      makePUTRequest("http://localhost/api/v1/staff/1", { name: "수정됨" }),
      STAFF1,
      makeContext({ id: "1" })
    )
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error.code).toBe("FORBIDDEN")
  })

  it("STF-012: 존재하지 않는 영업사원 수정 → 404 NOT_FOUND", async () => {
    mockStaffFindUnique.mockResolvedValue(null)

    const res = await (updateStaff as AuthedHandler)(
      makePUTRequest("http://localhost/api/v1/staff/999", { name: "수정됨" }),
      SUPER,
      makeContext({ id: "999" })
    )
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error.code).toBe("NOT_FOUND")
  })

  it("STF-013: SUPERVISOR 정상 영업사원 수정 → 200, password 필드 없음", async () => {
    mockStaffFindUnique.mockResolvedValue({ id: 1 } as never)
    mockStaffFindFirst.mockResolvedValue(null)
    mockStaffUpdate.mockResolvedValue({
      ...dbStaff1,
      name: "수정된직원명",
    } as never)

    const res = await (updateStaff as AuthedHandler)(
      makePUTRequest("http://localhost/api/v1/staff/1", { name: "수정된직원명" }),
      SUPER,
      makeContext({ id: "1" })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.name).toBe("수정된직원명")
    expect(body.data).not.toHaveProperty("password")
  })
})
