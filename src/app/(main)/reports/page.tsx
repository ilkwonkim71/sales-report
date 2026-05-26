"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { apiFetch, ApiError } from "@/lib/api-client"
import { StatusBadge } from "@/components/StatusBadge"
import { getReportStatus } from "@/types"
import type { ReportListItem } from "@/types"

function thisMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function formatDate(dateStr: string): string {
  return dateStr.replace(/-/g, ".")
}

function monthToRange(month: string): { from: string; to: string } {
  const [year, m] = month.split("-").map(Number)
  const lastDay = new Date(year, m, 0).getDate()
  return {
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, "0")}`,
  }
}

export default function ReportsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [reports, setReports] = useState<ReportListItem[]>([])
  const [month, setMonth] = useState(thisMonth)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReports = useCallback(async (selectedMonth: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const { from, to } = monthToRange(selectedMonth)
      const data = await apiFetch<ReportListItem[]>(
        `/api/v1/reports?from=${from}&to=${to}`,
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
  }, [])

  useEffect(() => {
    if (!authLoading && user) {
      fetchReports(month)
    }
  }, [authLoading, user, month, fetchReports])

  if (authLoading || !user) return null

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">보고서 목록</h1>
      </div>

      <div className="mb-4">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-gray-500">불러오는 중...</div>
      ) : error ? (
        <div className="py-20 text-center text-red-600">{error}</div>
      ) : reports.length === 0 ? (
        <div className="py-20 text-center text-gray-500">
          해당 월에 작성된 보고서가 없습니다.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  날짜
                </th>
                {user.role === "SUPERVISOR" && (
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    영업사원
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  방문 건수
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  특이사항
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  개선계획
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  상태
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {formatDate(r.reportDate)}
                  </td>
                  {user.role === "SUPERVISOR" && (
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {r.staff.name}
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {r.visitCount}건
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {r.hasProblem ? "있음" : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {r.hasPlan ? "있음" : "-"}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={getReportStatus(r)} />
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
