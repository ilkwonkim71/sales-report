"use client"

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
} from "react"
import { useRouter } from "next/navigation"
import { apiFetch, ApiError } from "@/lib/api-client"
import type { Customer } from "@/types/customer"
import type { ReportDetail } from "@/types/report"

interface VisitRow {
  key: string
  customerId: number | null
  customerLabel: string
  visitContent: string
  // For edit mode: existing visit id
  visitId?: number
}

interface Props {
  /** When provided, the form operates in edit mode */
  reportId?: number
  initialData?: ReportDetail
}

let rowCounter = 0
function nextKey() {
  return `row-${++rowCounter}`
}

export function ReportForm({ reportId, initialData }: Props) {
  const router = useRouter()
  const isEditMode = reportId !== undefined

  // Report date is fixed to today in create mode; read from initialData in edit mode
  const today = new Date().toISOString().slice(0, 10)
  const reportDate = initialData?.reportDate ?? today

  // Initialise visit rows
  function makeInitialRows(): VisitRow[] {
    if (initialData && initialData.visits.length > 0) {
      return initialData.visits.map((v) => ({
        key: nextKey(),
        customerId: v.customer.id,
        customerLabel: v.customer.companyName,
        visitContent: v.visitContent,
        visitId: v.id,
      }))
    }
    return [{ key: nextKey(), customerId: null, customerLabel: "", visitContent: "" }]
  }

  const [rows, setRows] = useState<VisitRow[]>(makeInitialRows)
  const [problem, setProblem] = useState(initialData?.problem ?? "")
  const [plan, setPlan] = useState(initialData?.plan ?? "")
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Customer search state per row
  const [searchQuery, setSearchQuery] = useState<Record<string, string>>({})
  const [searchResults, setSearchResults] = useState<Record<string, Customer[]>>({})
  const [searchOpen, setSearchOpen] = useState<Record<string, boolean>>({})
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  function handleSearchInput(rowKey: string, query: string) {
    setSearchQuery((prev) => ({ ...prev, [rowKey]: query }))
    setSearchOpen((prev) => ({ ...prev, [rowKey]: true }))

    if (debounceRef.current[rowKey]) {
      clearTimeout(debounceRef.current[rowKey])
    }

    if (!query.trim()) {
      setSearchResults((prev) => ({ ...prev, [rowKey]: [] }))
      return
    }

    debounceRef.current[rowKey] = setTimeout(async () => {
      try {
        const results = await apiFetch<Customer[]>(
          `/api/v1/customers?q=${encodeURIComponent(query)}`,
        )
        setSearchResults((prev) => ({ ...prev, [rowKey]: results }))
      } catch (err) {
        console.warn("Customer search failed:", err)
      }
    }, 300)
  }

  function selectCustomer(rowKey: string, customer: Customer) {
    setRows((prev) =>
      prev.map((r) =>
        r.key === rowKey
          ? { ...r, customerId: customer.id, customerLabel: customer.companyName }
          : r,
      ),
    )
    setSearchQuery((prev) => ({ ...prev, [rowKey]: "" }))
    setSearchOpen((prev) => ({ ...prev, [rowKey]: false }))
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[`customer-${rowKey}`]
      return next
    })
  }

  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      { key: nextKey(), customerId: null, customerLabel: "", visitContent: "" },
    ])
  }, [])

  const removeRow = useCallback((rowKey: string) => {
    setRows((prev) => prev.filter((r) => r.key !== rowKey))
  }, [])

  function updateVisitContent(rowKey: string, value: string) {
    setRows((prev) =>
      prev.map((r) => (r.key === rowKey ? { ...r, visitContent: value } : r)),
    )
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[`content-${rowKey}`]
      return next
    })
  }

  function validate(): boolean {
    const errors: Record<string, string> = {}
    rows.forEach((r) => {
      if (!r.customerId) errors[`customer-${r.key}`] = "고객을 선택해주세요."
      if (!r.visitContent.trim()) errors[`content-${r.key}`] = "방문 내용을 입력해주세요."
    })
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      if (!isEditMode) {
        // Create report
        const payload = {
          report_date: reportDate,
          visits: rows.map((r) => ({
            customer_id: r.customerId,
            visit_content: r.visitContent,
          })),
          ...(problem.trim() ? { problem: problem.trim() } : {}),
          ...(plan.trim() ? { plan: plan.trim() } : {}),
        }
        const created = await apiFetch<{ id: number }>(
          "/api/v1/reports",
          { method: "POST", body: JSON.stringify(payload) },
        )
        router.push(`/reports/${created.id}`)
      } else {
        // Edit mode — update problem/plan, handle visit changes
        const updatePayload: Record<string, string> = {
          problem: problem.trim(),
          plan: plan.trim(),
        }
        await apiFetch(`/api/v1/reports/${reportId}`, {
          method: "PUT",
          body: JSON.stringify(updatePayload),
        })

        // Handle visits: delete removed, add new
        const originalIds = new Set(
          (initialData?.visits ?? []).map((v) => v.id),
        )
        const currentIds = new Set(
          rows.filter((r) => r.visitId).map((r) => r.visitId),
        )

        // Delete visits no longer present
        for (const vid of originalIds) {
          if (!currentIds.has(vid)) {
            await apiFetch(`/api/v1/reports/${reportId}/visits/${vid}`, {
              method: "DELETE",
            })
          }
        }

        // Add new visits (no visitId)
        for (const row of rows) {
          if (!row.visitId) {
            await apiFetch(`/api/v1/reports/${reportId}/visits`, {
              method: "POST",
              body: JSON.stringify({
                customer_id: row.customerId,
                visit_content: row.visitContent,
              }),
            })
          }
        }

        router.push(`/reports/${reportId}`)
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "REPORT_ALREADY_EXISTS") {
          setSubmitError("오늘 날짜의 보고서가 이미 존재합니다.")
        } else {
          setSubmitError(err.message)
        }
      } else {
        setSubmitError("저장 중 오류가 발생했습니다.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Close dropdown on outside click
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setSearchOpen({})
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const title = isEditMode ? "보고서 편집" : "새 보고서 작성"

  return (
    <div ref={containerRef}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">
          보고 날짜:{" "}
          <span className="font-medium text-gray-700">
            {reportDate.replace(/-/g, ".")}
          </span>
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        {/* Visit records */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-gray-800">
            방문 기록
          </h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-64">
                    고객
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    방문 내용
                  </th>
                  <th className="px-4 py-3 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.key}>
                    {/* Customer select */}
                    <td className="px-4 py-3 align-top">
                      <div className="relative">
                        {row.customerId ? (
                          <div className="flex items-center gap-2">
                            <span className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
                              {row.customerLabel}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setRows((prev) =>
                                  prev.map((r) =>
                                    r.key === row.key
                                      ? { ...r, customerId: null, customerLabel: "", visitId: undefined }
                                      : r,
                                  ),
                                )
                              }
                              className="text-xs text-gray-400 hover:text-red-500"
                              aria-label="고객 선택 해제"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <>
                            <input
                              type="text"
                              placeholder="고객 검색..."
                              value={searchQuery[row.key] ?? ""}
                              onChange={(e) =>
                                handleSearchInput(row.key, e.target.value)
                              }
                              onFocus={() =>
                                setSearchOpen((prev) => ({
                                  ...prev,
                                  [row.key]: true,
                                }))
                              }
                              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                                fieldErrors[`customer-${row.key}`]
                                  ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                              }`}
                            />
                            {searchOpen[row.key] &&
                              (searchResults[row.key]?.length ?? 0) > 0 && (
                                <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                                  {searchResults[row.key].map((c) => (
                                    <li key={c.id}>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          selectCustomer(row.key, c)
                                        }
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
                                      >
                                        <span className="font-medium">
                                          {c.companyName}
                                        </span>
                                        <span className="ml-2 text-gray-500">
                                          {c.contactName}
                                        </span>
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                          </>
                        )}
                        {fieldErrors[`customer-${row.key}`] && (
                          <p className="mt-1 text-xs text-red-600">
                            {fieldErrors[`customer-${row.key}`]}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Visit content */}
                    <td className="px-4 py-3 align-top">
                      <textarea
                        value={row.visitContent}
                        onChange={(e) =>
                          updateVisitContent(row.key, e.target.value)
                        }
                        rows={2}
                        placeholder="방문 내용을 입력하세요"
                        className={`w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 ${
                          fieldErrors[`content-${row.key}`]
                            ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                            : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        }`}
                      />
                      {fieldErrors[`content-${row.key}`] && (
                        <p className="mt-1 text-xs text-red-600">
                          {fieldErrors[`content-${row.key}`]}
                        </p>
                      )}
                    </td>

                    {/* Delete row */}
                    <td className="px-4 py-3 align-top text-center">
                      <button
                        type="button"
                        disabled={rows.length === 1}
                        onClick={() => removeRow(row.key)}
                        className="rounded p-1 text-gray-400 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30 transition-colors"
                        aria-label="행 삭제"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={addRow}
            className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            + 행 추가
          </button>
        </section>

        {/* Problem */}
        <section>
          <label
            htmlFor="problem"
            className="mb-1 block text-base font-semibold text-gray-800"
          >
            특이 사항 (Problem)
          </label>
          <textarea
            id="problem"
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            rows={4}
            placeholder="특이 사항을 입력하세요 (선택)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </section>

        {/* Plan */}
        <section>
          <label
            htmlFor="plan"
            className="mb-1 block text-base font-semibold text-gray-800"
          >
            향후 계획 (Plan)
          </label>
          <textarea
            id="plan"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            rows={4}
            placeholder="향후 계획을 입력하세요 (선택)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </section>

        {submitError && (
          <p role="alert" className="text-sm text-red-600">
            {submitError}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  )
}
