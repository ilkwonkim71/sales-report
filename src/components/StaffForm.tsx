"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { apiFetch, ApiError } from "@/lib/api-client"
import type { Role } from "@/types/auth"
import type { Staff, CreateStaffForm } from "@/types/staff"

interface Props {
  staffId?: number
  initialData?: Staff
}

export function StaffForm({ staffId, initialData }: Props) {
  const router = useRouter()
  const isEditMode = staffId !== undefined

  const [name, setName] = useState(initialData?.name ?? "")
  const [email, setEmail] = useState(initialData?.email ?? "")
  const [role, setRole] = useState<Role>(initialData?.role ?? "STAFF")
  const [department, setDepartment] = useState(initialData?.department ?? "")
  const [password, setPassword] = useState("")

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function validate(): boolean {
    const errors: Record<string, string> = {}
    if (!name.trim()) errors.name = "이름을 입력해주세요."
    if (!email.trim()) errors.email = "이메일을 입력해주세요."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "올바른 이메일 형식이 아닙니다."
    }
    if (!isEditMode && !password.trim()) {
      errors.password = "비밀번호를 입력해주세요."
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  function clearFieldError(field: string) {
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      if (!isEditMode) {
        const payload: CreateStaffForm = {
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          role,
          ...(department.trim() ? { department: department.trim() } : {}),
        }
        await apiFetch<Staff>("/api/v1/staff", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      } else {
        const payload: Record<string, string> = {
          name: name.trim(),
          email: email.trim(),
          role,
          ...(department.trim() ? { department: department.trim() } : {}),
        }
        await apiFetch<Staff>(`/api/v1/staff/${staffId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        })
      }
      router.push("/staff")
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "EMAIL_ALREADY_EXISTS") {
          setFieldErrors((prev) => ({
            ...prev,
            email: "이미 사용 중인 이메일입니다.",
          }))
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

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        {isEditMode ? "영업사원 편집" : "영업사원 등록"}
      </h1>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Name */}
        <div>
          <label
            htmlFor="staffName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            이름 <span className="text-red-500">*</span>
          </label>
          <input
            id="staffName"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); clearFieldError("name") }}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              fieldErrors.name
                ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            }`}
            disabled={isSubmitting}
          />
          {fieldErrors.name && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="staffEmail"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            이메일 <span className="text-red-500">*</span>
          </label>
          <input
            id="staffEmail"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearFieldError("email") }}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              fieldErrors.email
                ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            }`}
            disabled={isSubmitting}
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
          )}
        </div>

        {/* Role */}
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-2">
            역할 <span className="text-red-500">*</span>
          </legend>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="role"
                value="STAFF"
                checked={role === "STAFF"}
                onChange={() => setRole("STAFF")}
                disabled={isSubmitting}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">영업사원 (STAFF)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="role"
                value="SUPERVISOR"
                checked={role === "SUPERVISOR"}
                onChange={() => setRole("SUPERVISOR")}
                disabled={isSubmitting}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">관리자 (SUPERVISOR)</span>
            </label>
          </div>
        </fieldset>

        {/* Department */}
        <div>
          <label
            htmlFor="department"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            부서
          </label>
          <input
            id="department"
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={isSubmitting}
          />
        </div>

        {/* Password — registration only */}
        {!isEditMode && (
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              비밀번호 <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearFieldError("password") }}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                fieldErrors.password
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              }`}
              disabled={isSubmitting}
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
            )}
          </div>
        )}

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
            onClick={() => router.push("/staff")}
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
