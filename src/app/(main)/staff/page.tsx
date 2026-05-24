"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { apiFetch, ApiError } from "@/lib/api-client"
import type { Staff } from "@/types/staff"

const roleLabels: Record<string, string> = {
  STAFF: "영업사원",
  SUPERVISOR: "관리자",
}

const roleStyles: Record<string, string> = {
  STAFF: "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800",
  SUPERVISOR: "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-800",
}

function formatDate(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, ".")
}

export default function StaffPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!authLoading && user?.role === "STAFF") {
      router.replace("/reports")
    }
  }, [authLoading, user, router])

  const fetchStaff = useCallback(async (q: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const params = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""
      const data = await apiFetch<Staff[]>(`/api/v1/staff${params}`)
      setStaffList(data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("영업사원 목록을 불러오는 중 오류가 발생했습니다.")
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && user?.role === "SUPERVISOR") {
      fetchStaff("")
    }
  }, [authLoading, user, fetchStaff])

  function handleSearch(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchStaff(value)
    }, 300)
  }

  if (authLoading || user?.role !== "SUPERVISOR") {
    return null
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">영업사원 마스터</h1>
        <Link
          href="/staff/new"
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          영업사원 등록
        </Link>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="이름 또는 이메일로 검색"
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-gray-500">불러오는 중...</div>
      ) : error ? (
        <div className="py-20 text-center text-red-600">{error}</div>
      ) : staffList.length === 0 ? (
        <div className="py-20 text-center text-gray-500">
          {query ? "검색 결과가 없습니다." : "등록된 영업사원이 없습니다."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  이름
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  이메일
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  부서
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  역할
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  등록일
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staffList.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {s.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {s.email}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {s.department ?? "-"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={roleStyles[s.role]}>
                      {roleLabels[s.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(s.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/staff/${s.id}/edit`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      편집
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
