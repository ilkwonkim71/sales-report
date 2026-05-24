/**
 * @jest-environment node
 */
import { POST } from "@/app/api/v1/auth/login/route"
import { NextRequest } from "next/server"

// ── mocks ──────────────────────────────────────────────────────────────────

jest.mock("@/lib/prisma", () => ({
  prisma: {
    salesStaff: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
}))

jest.mock("@/lib/jwt", () => ({
  signToken: jest.fn().mockReturnValue("mock.jwt.token"),
}))

// ── helpers ────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

const mockFindUnique = prisma.salesStaff.findUnique as jest.Mock
const mockCompare = bcrypt.compare as jest.Mock

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const staffRow = {
  id: 1,
  name: "홍길동",
  email: "staff1@test.com",
  password: "$2b$10$hashedpassword",
  role: "STAFF" as const,
  department: "영업1팀",
  createdAt: new Date(),
}

const supervisorRow = {
  ...staffRow,
  id: 2,
  name: "이상급",
  email: "super@test.com",
  role: "SUPERVISOR" as const,
  department: "영업관리팀",
}

// ── tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  process.env.JWT_SECRET = "test-secret-at-least-32-chars-long!!"
  process.env.JWT_EXPIRES_IN = "7d"
})

describe("POST /api/v1/auth/login", () => {
  // AUTH-001: STAFF 정상 로그인
  it("AUTH-001: STAFF 정상 로그인 → 200, JWT 및 role: STAFF 반환", async () => {
    mockFindUnique.mockResolvedValue(staffRow)
    mockCompare.mockResolvedValue(true)

    const res = await POST(makeRequest({ email: "staff1@test.com", password: "password" }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.token).toBe("mock.jwt.token")
    expect(body.data.user.role).toBe("STAFF")
    expect(body.data.user.email).toBe("staff1@test.com")
    expect(body.data.user).not.toHaveProperty("password")
  })

  // AUTH-002: SUPERVISOR 정상 로그인
  it("AUTH-002: SUPERVISOR 정상 로그인 → 200, role: SUPERVISOR 반환", async () => {
    mockFindUnique.mockResolvedValue(supervisorRow)
    mockCompare.mockResolvedValue(true)

    const res = await POST(makeRequest({ email: "super@test.com", password: "password" }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.user.role).toBe("SUPERVISOR")
  })

  // AUTH-003: 비밀번호 불일치
  it("AUTH-003: 잘못된 비밀번호 → 401 INVALID_CREDENTIALS", async () => {
    mockFindUnique.mockResolvedValue(staffRow)
    mockCompare.mockResolvedValue(false)

    const res = await POST(makeRequest({ email: "staff1@test.com", password: "wrong" }))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe("INVALID_CREDENTIALS")
  })

  // AUTH-004: 미등록 이메일
  it("AUTH-004: 미등록 이메일 → 401 INVALID_CREDENTIALS", async () => {
    mockFindUnique.mockResolvedValue(null)
    mockCompare.mockResolvedValue(false)

    const res = await POST(makeRequest({ email: "nobody@test.com", password: "password" }))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe("INVALID_CREDENTIALS")
  })

  // AUTH-005: email 필드 누락
  it("AUTH-005: email 필드 누락 → 400", async () => {
    const res = await POST(makeRequest({ password: "password" }))

    expect(res.status).toBe(400)
  })

  // AUTH-006: password 필드 누락
  it("AUTH-006: password 필드 누락 → 400", async () => {
    const res = await POST(makeRequest({ email: "staff1@test.com" }))

    expect(res.status).toBe(400)
  })

  it("응답 JSON에 password 필드 없음", async () => {
    mockFindUnique.mockResolvedValue(staffRow)
    mockCompare.mockResolvedValue(true)

    const res = await POST(makeRequest({ email: "staff1@test.com", password: "password" }))
    const body = await res.json()

    expect(body.data.user.password).toBeUndefined()
  })
})
