"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { apiFetch, ApiError } from "@/lib/api-client"
import { ReportForm } from "@/components/ReportForm"
import type { ReportDetail } from "@/types/report"

interface Props {
  params: Promise<{ id: string }>
}

export default function EditReportPage({ params }: Props) {
  const router = useRouter()
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
        // Only the report author can edit, and only on the same day
        const today = new Date().toISOString().slice(0, 10)
        if (user && user.id !== data.staff.id) {
          router.replace(`/reports/${numId}`)
          return
        }
        if (data.reportDate !== today) {
          router.replace(`/reports/${numId}`)
          return
        }
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
  }, [params, user, router])

  if (error) {
    return (
      <div className="py-20 text-center text-red-600">{error}</div>
    )
  }

  if (!report || reportId === null) {
    return (
      <div className="py-20 text-center text-gray-500">불러오는 중...</div>
    )
  }

  return <ReportForm reportId={reportId} initialData={report} />
}
