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

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
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
import { POST as logoutPOST } from "@/app/api/v1/auth/logout/route"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { isBlacklisted, addToBlacklist } from "@/lib/tokenBlacklist"
import { verifyToken } from "@/lib/jwt"

// ── typed mock refs ───────────────────────────────────────────────────────────

const mockFindUnique = prisma.salesStaff.findUnique as jest.MockedFunction<typeof prisma.salesStaff.findUnique>
const mockCompare = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>
const mockIsBlacklisted = isBlacklisted as jest.MockedFunction<typeof isBlacklisted>
const mockAddToBlacklist = addToBlacklist as jest.MockedFunction<typeof addToBlacklist>
const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>

// ── fixtures ──────────────────────────────────────────────────────────────────

const staffRow = {
  id: 1,
  name: "Staff One",
  email: "staff1@test.com",
  password: "$2b$10$hashedpassword",
  role: "STAFF" as const,
  department: "영업1팀",
  createdAt: new Date(),
}

const supervisorRow = {
  id: 3,
  name: "Super User",
  email: "super@test.com",
  password: "$2b$10$hashedpassword",
  role: "SUPERVISOR" as const,
  department: "영업관리팀",
  createdAt: new Date(),
}

const validPayload = {
  sub: 1,
  name: "Staff One",
  email: "staff1@test.com",
  role: "STAFF" as const,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
}

// ── helpers ───────────────────────────────────────────────────────────────────

function makeLoginRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeLogoutRequest(token?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (token !== undefined) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return new NextRequest("http://localhost/api/v1/auth/logout", {
    method: "POST",
    headers,
  })
}

const dummyContext = { params: Promise.resolve({}) }

// ── tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  mockIsBlacklisted.mockReturnValue(false)
  process.env.JWT_SECRET = "test-secret-at-least-32-chars-long!!"
  process.env.JWT_EXPIRES_IN = "7d"
})

describe("POST /api/v1/auth/login", () => {
  it("AUTH-001: STAFF 정상 로그인 → 200, JWT 및 role: STAFF 반환", async () => {
    mockFindUnique.mockResolvedValue(staffRow)
    mockCompare.mockResolvedValue(true as never)

    const res = await loginPOST(makeLoginRequest({ email: "staff1@test.com", password: "password" }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.token).toBe("mock.jwt.token")
    expect(body.data.user.role).toBe("STAFF")
    expect(body.data.user.email).toBe("staff1@test.com")
    expect(body.data.user).not.toHaveProperty("password")
  })

  it("AUTH-002: SUPERVISOR 정상 로그인 → 200, role: SUPERVISOR 반환", async () => {
    mockFindUnique.mockResolvedValue(supervisorRow)
    mockCompare.mockResolvedValue(true as never)

    const res = await loginPOST(makeLoginRequest({ email: "super@test.com", password: "password" }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.user.role).toBe("SUPERVISOR")
  })

  it("AUTH-003: 잘못된 비밀번호 → 401 INVALID_CREDENTIALS", async () => {
    mockFindUnique.mockResolvedValue(staffRow)
    mockCompare.mockResolvedValue(false as never)

    const res = await loginPOST(makeLoginRequest({ email: "staff1@test.com", password: "wrongpassword" }))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe("INVALID_CREDENTIALS")
  })

  it("AUTH-004: 미등록 이메일 → 401 INVALID_CREDENTIALS", async () => {
    mockFindUnique.mockResolvedValue(null)
    mockCompare.mockResolvedValue(false as never)

    const res = await loginPOST(makeLoginRequest({ email: "nobody@test.com", password: "password" }))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe("INVALID_CREDENTIALS")
  })

  it("AUTH-005: email 필드 누락 → 400", async () => {
    const res = await loginPOST(makeLoginRequest({ password: "password" }))

    expect(res.status).toBe(400)
  })

  it("AUTH-006: password 필드 누락 → 400", async () => {
    const res = await loginPOST(makeLoginRequest({ email: "staff1@test.com" }))

    expect(res.status).toBe(400)
  })
})

describe("POST /api/v1/auth/logout (withAuth 보호 라우트)", () => {
  it("AUTH-007: Authorization 헤더 없이 요청 → 401 UNAUTHORIZED", async () => {
    const res = await logoutPOST(makeLogoutRequest(), dummyContext)

    expect(res.status).toBe(401)
  })

  it("AUTH-008: 만료/위조 토큰 → 401 UNAUTHORIZED", async () => {
    mockVerifyToken.mockImplementation(() => {
      const err = new Error("jwt expired")
      err.name = "TokenExpiredError"
      throw err
    })

    const res = await logoutPOST(makeLogoutRequest("expired.token.here"), dummyContext)

    expect(res.status).toBe(401)
  })

  it("AUTH-009: 로그아웃 후 동일 토큰 재사용 → 401 (블랙리스트)", async () => {
    mockVerifyToken.mockReturnValue(validPayload)
    mockIsBlacklisted.mockReturnValue(true)

    const res = await logoutPOST(makeLogoutRequest("blacklisted.token"), dummyContext)

    expect(res.status).toBe(401)
  })

  it("로그아웃 성공 → 200 { data: null }, 토큰 블랙리스트 등록", async () => {
    mockVerifyToken.mockReturnValue(validPayload)
    mockIsBlacklisted.mockReturnValue(false)

    const res = await logoutPOST(makeLogoutRequest("valid.token"), dummyContext)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ data: null })
    expect(mockAddToBlacklist).toHaveBeenCalledWith("valid.token")
  })
})
