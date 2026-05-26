"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { apiFetch, ApiError } from "@/lib/api-client"
import type { Customer } from "@/types"

function formatDate(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, ".")
}

export default function CustomersPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchCustomers = useCallback(async (q: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : ""
      const data = await apiFetch<Customer[]>(`/api/v1/customers${params}`)
      setCustomers(data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("고객 목록을 불러오는 중 오류가 발생했습니다.")
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && user) fetchCustomers("")
  }, [authLoading, user, fetchCustomers])

  function handleSearch(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchCustomers(value), 300)
  }

  if (authLoading || !user) return null

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">고객 마스터</h1>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="회사명 또는 담당자명으로 검색"
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-gray-500">불러오는 중...</div>
      ) : error ? (
        <div className="py-20 text-center text-red-600">{error}</div>
      ) : customers.length === 0 ? (
        <div className="py-20 text-center text-gray-500">
          {query ? "검색 결과가 없습니다." : "등록된 고객이 없습니다."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  회사명
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  담당자
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  전화번호
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  주소
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  등록일
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {c.companyName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {c.contactName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {c.phone ?? "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {c.address ?? "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(c.createdAt)}
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
