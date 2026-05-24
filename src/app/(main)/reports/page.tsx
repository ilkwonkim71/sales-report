"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { apiFetch, ApiError } from "@/lib/api-client"
import { StatusBadge } from "@/components/StatusBadge"
import { getReportStatus } from "@/types/report"
import type { ReportListItem } from "@/types/report"
import type { Staff } from "@/types/staff"

function toMonthString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

function toDisplayDate(iso: string): string {
  // iso: "YYYY-MM-DD"
  return iso.replace(/-/g, ".")
}

export default function ReportsListPage() {
  const { user } = useAuth()

  const [month, setMonth] = useState(() => toMonthString(new Date()))
  const [staffId, setStaffId] = useState<string>("")
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [reports, setReports] = useState<ReportListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load staff list for SUPERVISOR filter
  useEffect(() => {
    if (user?.role !== "SUPERVISOR") return
    apiFetch<Staff[]>("/api/v1/staff").then(setStaffList).catch((err) => {
      console.warn("Failed to load staff list:", err)
    })
  }, [user])

  const fetchReports = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ month })
      if (staffId) params.set("staff_id", staffId)
      const data = await apiFetch<ReportListItem[]>(
        `/api/v1/reports?${params.toString()}`,
      )
      setReports(data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("보고서 목록을 불러오는 중 오류가 발생했습니다.")
      }
    } finally {
      setIsLoading(false)
    }
  }, [month, staffId])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const todayStr = new Date().toISOString().slice(0, 10)
  const hasTodayReport = reports.some((r) => r.reportDate === todayStr)

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">일일 보고서</h1>

        {user?.role === "STAFF" && (
          <Link
            href="/reports/new"
            aria-disabled={hasTodayReport}
            onClick={(e) => hasTodayReport && e.preventDefault()}
            className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              hasTodayReport
                ? "pointer-events-none cursor-not-allowed bg-gray-100 text-gray-400"
                : "bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            }`}
          >
            새 보고서 작성
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <label
            htmlFor="month-filter"
            className="text-sm font-medium text-gray-700"
          >
            월 선택
          </label>
          <input
            id="month-filter"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {user?.role === "SUPERVISOR" && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="staff-filter"
              className="text-sm font-medium text-gray-700"
            >
              담당자
            </label>
            <select
              id="staff-filter"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">전체</option>
              {staffList.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-20 text-center text-gray-500">불러오는 중...</div>
      ) : error ? (
        <div className="py-20 text-center text-red-600">{error}</div>
      ) : reports.length === 0 ? (
        <div className="py-20 text-center text-gray-500">
          이 달의 보고서가 없습니다.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  보고 날짜
                </th>
                {user?.role === "SUPERVISOR" && (
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    작성자
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  방문 건수
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  상태
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {toDisplayDate(report.reportDate)}
                  </td>
                  {user?.role === "SUPERVISOR" && (
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {report.staff.name}
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {report.visitCount}건
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={getReportStatus(report)} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/reports/${report.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      상세보기
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
