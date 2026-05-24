"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { apiFetch, ApiError } from "@/lib/api-client"
import type { Customer, CreateCustomerForm } from "@/types/customer"

interface Props {
  customerId?: number
  initialData?: Customer
}

export function CustomerForm({ customerId, initialData }: Props) {
  const router = useRouter()
  const isEditMode = customerId !== undefined

  const [companyName, setCompanyName] = useState(initialData?.companyName ?? "")
  const [contactName, setContactName] = useState(initialData?.contactName ?? "")
  const [phone, setPhone] = useState(initialData?.phone ?? "")
  const [address, setAddress] = useState(initialData?.address ?? "")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function validate(): boolean {
    const errors: Record<string, string> = {}
    if (!companyName.trim()) errors.companyName = "회사명을 입력해주세요."
    if (!contactName.trim()) errors.contactName = "담당자명을 입력해주세요."
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    setSubmitError(null)

    const payload: CreateCustomerForm = {
      companyName: companyName.trim(),
      contactName: contactName.trim(),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      ...(address.trim() ? { address: address.trim() } : {}),
    }

    try {
      if (!isEditMode) {
        await apiFetch<Customer>("/api/v1/customers", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      } else {
        await apiFetch<Customer>(`/api/v1/customers/${customerId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        })
      }
      router.push("/customers")
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message)
      } else {
        setSubmitError("저장 중 오류가 발생했습니다.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        {isEditMode ? "고객 편집" : "고객 등록"}
      </h1>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Company name */}
        <div>
          <label
            htmlFor="companyName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            회사명 <span className="text-red-500">*</span>
          </label>
          <input
            id="companyName"
            type="text"
            value={companyName}
            onChange={(e) => {
              setCompanyName(e.target.value)
              setFieldErrors((prev) => { const n = { ...prev }; delete n.companyName; return n })
            }}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              fieldErrors.companyName
                ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            }`}
            disabled={isSubmitting}
          />
          {fieldErrors.companyName && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.companyName}</p>
          )}
        </div>

        {/* Contact name */}
        <div>
          <label
            htmlFor="contactName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            담당자명 <span className="text-red-500">*</span>
          </label>
          <input
            id="contactName"
            type="text"
            value={contactName}
            onChange={(e) => {
              setContactName(e.target.value)
              setFieldErrors((prev) => { const n = { ...prev }; delete n.contactName; return n })
            }}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              fieldErrors.contactName
                ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            }`}
            disabled={isSubmitting}
          />
          {fieldErrors.contactName && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.contactName}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            연락처
          </label>
          <input
            id="phone"
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={isSubmitting}
          />
        </div>

        {/* Address */}
        <div>
          <label
            htmlFor="address"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            주소
          </label>
          <input
            id="address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={isSubmitting}
          />
        </div>

        {submitError && (
          <p role="alert" className="text-sm text-red-600">
            {submitError}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {isSubmitting ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/customers")}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  )
}
