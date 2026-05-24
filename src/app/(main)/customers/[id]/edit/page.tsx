"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { apiFetch, ApiError } from "@/lib/api-client"
import { CustomerForm } from "@/components/CustomerForm"
import type { Customer } from "@/types/customer"

interface Props {
  params: Promise<{ id: string }>
}

export default function EditCustomerPage({ params }: Props) {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && user?.role === "STAFF") {
      router.replace("/customers")
      return
    }

    async function load() {
      const { id } = await params
      const numId = Number(id)
      setCustomerId(numId)
      try {
        const data = await apiFetch<Customer>(`/api/v1/customers/${numId}`)
        setCustomer(data)
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError("고객 정보를 불러오는 중 오류가 발생했습니다.")
        }
      }
    }

    if (!authLoading) {
      load()
    }
  }, [authLoading, user, params, router])

  if (error) {
    return <div className="py-20 text-center text-red-600">{error}</div>
  }

  if (!customer || customerId === null) {
    return (
      <div className="py-20 text-center text-gray-500">불러오는 중...</div>
    )
  }

  return <CustomerForm customerId={customerId} initialData={customer} />
}
