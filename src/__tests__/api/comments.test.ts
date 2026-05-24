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

import { POST as createComment } from "@/app/api/v1/reports/[id]/comments/route"
import { DELETE as deleteComment } from "@/app/api/v1/reports/[id]/comments/[commentId]/route"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import type { AuthenticatedUser } from "@/types/auth"
import type { AuthedHandler } from "@/lib/withAuth"

// ── typed mock refs ───────────────────────────────────────────────────────────

const mockReportFindUnique = prisma.dailyReport.findUnique as jest.MockedFunction<typeof prisma.dailyReport.findUnique>
const mockCommentFindFirst = prisma.comment.findFirst as jest.MockedFunction<typeof prisma.comment.findFirst>
const mockCommentCreate = prisma.comment.create as jest.MockedFunction<typeof prisma.comment.create>
const mockCommentDelete = prisma.comment.delete as jest.MockedFunction<typeof prisma.comment.delete>

// ── fixtures ──────────────────────────────────────────────────────────────────

const STAFF1: AuthenticatedUser = { id: 1, name: "Staff One", email: "staff1@test.com", role: "STAFF" }
const SUPER: AuthenticatedUser = { id: 3, name: "Super User", email: "super@test.com", role: "SUPERVISOR" }
const SUPER2: AuthenticatedUser = { id: 4, name: "Super Two", email: "super2@test.com", role: "SUPERVISOR" }

const dbReport = { id: 10 }
const dbComment = {
  id: 200,
  dailyReportId: 10,
  authorId: 3,
  targetType: "PROBLEM" as const,
  content: "문제점 피드백",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  author: { id: 3, name: "Super User" },
}

// ── helpers ───────────────────────────────────────────────────────────────────

function makePOSTRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: "POST",
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

describe("POST /api/v1/reports/:id/comments", () => {
  it("COM-001: SUPERVISOR가 PROBLEM 댓글 등록 → 201", async () => {
    mockReportFindUnique.mockResolvedValue(dbReport as never)
    mockCommentCreate.mockResolvedValue(dbComment as never)

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
    expect(body.data.content).toBe("문제점 피드백")
    expect(body.data.author).toBeDefined()
  })

  it("COM-002: SUPERVISOR가 PLAN 댓글 등록 → 201", async () => {
    mockReportFindUnique.mockResolvedValue(dbReport as never)
    mockCommentCreate.mockResolvedValue({
      ...dbComment,
      id: 201,
      targetType: "PLAN" as const,
      content: "계획 피드백",
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

  it("COM-003: 존재하지 않는 보고서에 댓글 → 404 NOT_FOUND", async () => {
    mockReportFindUnique.mockResolvedValue(null)

    const res = await (createComment as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/reports/999/comments", {
        target_type: "PROBLEM",
        content: "피드백",
      }),
      SUPER,
      makeContext({ id: "999" })
    )
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error.code).toBe("NOT_FOUND")
  })

  it("COM-004: STAFF가 댓글 등록 → 403 FORBIDDEN", async () => {
    const res = await (createComment as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/reports/10/comments", {
        target_type: "PROBLEM",
        content: "피드백",
      }),
      STAFF1,
      makeContext({ id: "10" })
    )
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error.code).toBe("FORBIDDEN")
  })

  it("COM-005: 잘못된 target_type → 400 BAD_REQUEST", async () => {
    mockReportFindUnique.mockResolvedValue(dbReport as never)

    const res = await (createComment as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/reports/10/comments", {
        target_type: "INVALID",
        content: "피드백",
      }),
      SUPER,
      makeContext({ id: "10" })
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe("BAD_REQUEST")
  })

  it("COM-006: content 누락 → 400 BAD_REQUEST", async () => {
    mockReportFindUnique.mockResolvedValue(dbReport as never)

    const res = await (createComment as AuthedHandler)(
      makePOSTRequest("http://localhost/api/v1/reports/10/comments", {
        target_type: "PROBLEM",
      }),
      SUPER,
      makeContext({ id: "10" })
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe("BAD_REQUEST")
  })
})

describe("DELETE /api/v1/reports/:id/comments/:commentId", () => {
  it("COM-007: 존재하지 않는 댓글 삭제 → 404 NOT_FOUND", async () => {
    mockCommentFindFirst.mockResolvedValue(null)

    const res = await (deleteComment as AuthedHandler)(
      makeDELETERequest("http://localhost/api/v1/reports/10/comments/999"),
      SUPER,
      makeContext({ id: "10", commentId: "999" })
    )
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error.code).toBe("NOT_FOUND")
  })

  it("COM-008: SUPERVISOR가 타인 댓글 삭제 → 403 FORBIDDEN", async () => {
    mockCommentFindFirst.mockResolvedValue({ ...dbComment, authorId: 3 } as never)

    const res = await (deleteComment as AuthedHandler)(
      makeDELETERequest("http://localhost/api/v1/reports/10/comments/200"),
      SUPER2,
      makeContext({ id: "10", commentId: "200" })
    )
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error.code).toBe("FORBIDDEN")
  })

  it("COM-009: SUPERVISOR가 본인 댓글 삭제 → 200 { data: null }", async () => {
    mockCommentFindFirst.mockResolvedValue({ ...dbComment, authorId: 3 } as never)
    mockCommentDelete.mockResolvedValue(dbComment as never)

    const res = await (deleteComment as AuthedHandler)(
      makeDELETERequest("http://localhost/api/v1/reports/10/comments/200"),
      SUPER,
      makeContext({ id: "10", commentId: "200" })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ data: null })
  })

  it("STAFF가 댓글 삭제 → 403 FORBIDDEN", async () => {
    const res = await (deleteComment as AuthedHandler)(
      makeDELETERequest("http://localhost/api/v1/reports/10/comments/200"),
      STAFF1,
      makeContext({ id: "10", commentId: "200" })
    )
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error.code).toBe("FORBIDDEN")
  })
})
