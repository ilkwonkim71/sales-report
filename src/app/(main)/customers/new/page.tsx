"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { CustomerForm } from "@/components/CustomerForm"

export default function NewCustomerPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && user?.role === "STAFF") {
      router.replace("/customers")
    }
  }, [isLoading, user, router])

  if (isLoading || user?.role === "STAFF") {
    return null
  }

  return <CustomerForm />
}
