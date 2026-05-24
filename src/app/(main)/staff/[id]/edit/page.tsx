"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { apiFetch, ApiError } from "@/lib/api-client"
import { StaffForm } from "@/components/StaffForm"
import type { Staff } from "@/types/staff"

interface Props {
  params: Promise<{ id: string }>
}

export default function EditStaffPage({ params }: Props) {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [staff, setStaff] = useState<Staff | null>(null)
  const [staffId, setStaffId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && user?.role !== "SUPERVISOR") {
      router.replace("/reports")
      return
    }

    async function load() {
      const { id } = await params
      const numId = Number(id)
      setStaffId(numId)
      try {
        const data = await apiFetch<Staff>(`/api/v1/staff/${numId}`)
        setStaff(data)
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError("영업사원 정보를 불러오는 중 오류가 발생했습니다.")
        }
      }
    }

    if (!authLoading && user?.role === "SUPERVISOR") {
      load()
    }
  }, [authLoading, user, params, router])

  if (error) {
    return <div className="py-20 text-center text-red-600">{error}</div>
  }

  if (!staff || staffId === null) {
    return (
      <div className="py-20 text-center text-gray-500">불러오는 중...</div>
    )
  }

  return <StaffForm staffId={staffId} initialData={staff} />
}
