"use client"

import { useState, useEffect, useCallback, type FormEvent } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { apiFetch, ApiError } from "@/lib/api-client"
import type { ReportDetail, ReportComment, CommentTarget } from "@/types/report"

interface Props {
  params: Promise<{ id: string }>
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, "0")
  const dy = String(d.getDate()).padStart(2, "0")
  const h = String(d.getHours()).padStart(2, "0")
  const min = String(d.getMinutes()).padStart(2, "0")
  return `${y}.${mo}.${dy} ${h}:${min}`
}

interface CommentSectionProps {
  targetType: CommentTarget
  comments: ReportComment[]
  reportId: number
  canComment: boolean
  onCommentAdded: (comment: ReportComment) => void
}

function CommentSection({
  targetType,
  comments,
  reportId,
  canComment,
  onCommentAdded,
}: CommentSectionProps) {
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const label = targetType === "PROBLEM" ? "특이 사항" : "향후 계획"

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!content.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const comment = await apiFetch<ReportComment>(
        `/api/v1/reports/${reportId}/comments`,
        {
          method: "POST",
          body: JSON.stringify({
            target_type: targetType,
            content: content.trim(),
          }),
        },
      )
      onCommentAdded(comment)
      setContent("")
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("댓글 등록 중 오류가 발생했습니다.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const filtered = comments.filter((c) => c.targetType === targetType)

  return (
    <div className="mt-4">
      <h4 className="mb-2 text-sm font-semibold text-gray-700">
        {label} 댓글
      </h4>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400">등록된 댓글이 없습니다.</p>
      ) : (
        <ul className="space-y-2 mb-3">
          {filtered.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-gray-700">
                  {c.author.name}
                </span>
                <span className="text-xs text-gray-400">
                  {formatDateTime(c.createdAt)}
                </span>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {c.content}
              </p>
            </li>
          ))}
        </ul>
      )}

      {canComment && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="댓글을 입력하세요"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "등록 중..." : "등록"}
          </button>
        </form>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export default function ReportDetailPage({ params }: Props) {
  const { user } = useAuth()
  const [report, setReport] = useState<ReportDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reportId, setReportId] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      const { id } = await params
      const numId = Number(id)
      setReportId(numId)

      try {
        const data = await apiFetch<ReportDetail>(`/api/v1/reports/${numId}`)
        setReport(data)
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError("보고서를 불러오는 중 오류가 발생했습니다.")
        }
      }
    }
    load()
  }, [params])

  const handleCommentAdded = useCallback((comment: ReportComment) => {
    setReport((prev) =>
      prev
        ? { ...prev, comments: [...prev.comments, comment] }
        : prev,
    )
  }, [])

  if (error) {
    return <div className="py-20 text-center text-red-600">{error}</div>
  }

  if (!report || reportId === null) {
    return (
      <div className="py-20 text-center text-gray-500">불러오는 중...</div>
    )
  }

  const today = new Date().toISOString().slice(0, 10)
  const isAuthor = user?.id === report.staff.id
  const isToday = report.reportDate === today
  const canEdit = isAuthor && isToday && user?.role === "STAFF"
  const canComment = user?.role === "SUPERVISOR"

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">보고서 상세</h1>
          <p className="mt-1 text-sm text-gray-500">
            {report.reportDate.replace(/-/g, ".")} &middot;{" "}
            {report.staff.name}
            {report.staff.department ? ` (${report.staff.department})` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Link
              href={`/reports/${reportId}/edit`}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              편집
            </Link>
          )}
          <Link
            href="/reports"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            목록
          </Link>
        </div>
      </div>

      {/* Visit records */}
      <section className="mb-8">
        <h2 className="mb-3 text-base font-semibold text-gray-800">
          방문 기록
        </h2>
        {report.visits.length === 0 ? (
          <p className="text-sm text-gray-400">방문 기록이 없습니다.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    고객
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    방문 내용
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.visits.map((v) => (
                  <tr key={v.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {v.customer.companyName}
                      <span className="ml-1 font-normal text-gray-500">
                        ({v.customer.contactName})
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-pre-wrap">
                      {v.visitContent}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Problem */}
      <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-base font-semibold text-gray-800">
          특이 사항 (Problem)
        </h2>
        {report.problem ? (
          <p className="text-sm text-gray-800 whitespace-pre-wrap">
            {report.problem}
          </p>
        ) : (
          <p className="text-sm text-gray-400">입력된 내용이 없습니다.</p>
        )}
        <CommentSection
          targetType="PROBLEM"
          comments={report.comments}
          reportId={reportId}
          canComment={canComment}
          onCommentAdded={handleCommentAdded}
        />
      </section>

      {/* Plan */}
      <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-base font-semibold text-gray-800">
          향후 계획 (Plan)
        </h2>
        {report.plan ? (
          <p className="text-sm text-gray-800 whitespace-pre-wrap">
            {report.plan}
          </p>
        ) : (
          <p className="text-sm text-gray-400">입력된 내용이 없습니다.</p>
        )}
        <CommentSection
          targetType="PLAN"
          comments={report.comments}
          reportId={reportId}
          canComment={canComment}
          onCommentAdded={handleCommentAdded}
        />
      </section>

      {/* Meta */}
      <p className="text-xs text-gray-400">
        작성: {formatDateTime(report.createdAt)} &nbsp;|&nbsp; 수정:{" "}
        {formatDateTime(report.updatedAt)}
      </p>
    </div>
  )
}
