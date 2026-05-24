"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { StaffForm } from "@/components/StaffForm"

export default function NewStaffPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && user?.role !== "SUPERVISOR") {
      router.replace("/reports")
    }
  }, [isLoading, user, router])

  if (isLoading || user?.role !== "SUPERVISOR") {
    return null
  }

  return <StaffForm />
}
