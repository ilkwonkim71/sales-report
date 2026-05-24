/**
 * @jest-environment node
 */
import { POST } from "@/app/api/v1/auth/logout/route"
import { NextRequest } from "next/server"

// ── mocks ──────────────────────────────────────────────────────────────────

jest.mock("@/lib/jwt", () => ({
  verifyToken: jest.fn(),
}))

jest.mock("@/lib/tokenBlacklist", () => ({
  isBlacklisted: jest.fn().mockReturnValue(false),
  addToBlacklist: jest.fn(),
}))

// ── helpers ────────────────────────────────────────────────────────────────

import { verifyToken } from "@/lib/jwt"
import { isBlacklisted, addToBlacklist } from "@/lib/tokenBlacklist"

const mockVerify = verifyToken as jest.Mock
const mockIsBlacklisted = isBlacklisted as jest.Mock
const mockAddToBlacklist = addToBlacklist as jest.Mock

const validPayload = {
  sub: 1,
  name: "홍길동",
  email: "staff1@test.com",
  role: "STAFF" as const,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
}

const dummyContext = { params: Promise.resolve({}) }

function makeRequest(token?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (token !== undefined) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return new NextRequest("http://localhost/api/v1/auth/logout", {
    method: "POST",
    headers,
  })
}

// ── tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  mockIsBlacklisted.mockReturnValue(false)
  process.env.JWT_SECRET = "test-secret-at-least-32-chars-long!!"
})

describe("POST /api/v1/auth/logout", () => {
  // AUTH-007: 토큰 없이 보호 API 호출
  it("AUTH-007: Authorization 헤더 없음 → 401", async () => {
    const res = await POST(makeRequest(), dummyContext)
    expect(res.status).toBe(401)
  })

  // AUTH-008: 만료된 토큰
  it("AUTH-008: 만료된 토큰 → 401", async () => {
    mockVerify.mockImplementation(() => {
      const err = new Error("jwt expired")
      err.name = "TokenExpiredError"
      throw err
    })

    const res = await POST(makeRequest("expired.token.here"), dummyContext)
    expect(res.status).toBe(401)
  })

  // AUTH-009: 로그아웃 성공
  it("AUTH-009: 로그아웃 성공 → 200 { data: null }", async () => {
    mockVerify.mockReturnValue(validPayload)

    const res = await POST(makeRequest("valid.token"), dummyContext)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ data: null })
    expect(mockAddToBlacklist).toHaveBeenCalledWith("valid.token")
  })

  it("AUTH-009: 블랙리스트 토큰으로 재요청 → 401", async () => {
    mockVerify.mockReturnValue(validPayload)
    mockIsBlacklisted.mockReturnValue(true)

    const res = await POST(makeRequest("blacklisted.token"), dummyContext)
    expect(res.status).toBe(401)
  })
})
