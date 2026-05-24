"use client"

import { useEffect, type ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

export default function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading, logout } = useAuth()

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      router.replace("/login")
      return
    }

    // STAFF cannot access /staff routes
    if (user.role === "STAFF" && pathname.startsWith("/staff")) {
      router.replace("/reports")
    }
  }, [isLoading, user, pathname, router])

  async function handleLogout() {
    await logout()
    router.replace("/login")
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="fixed inset-x-0 top-0 z-50 h-14 bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Navigation */}
          <nav className="flex items-center gap-1">
            <NavLink href="/reports" current={pathname}>
              보고서 목록
            </NavLink>
            <NavLink href="/customers" current={pathname}>
              고객 마스터
            </NavLink>
            {user.role === "SUPERVISOR" && (
              <NavLink href="/staff" current={pathname}>
                영업사원 마스터
              </NavLink>
            )}
          </nav>

          {/* User info + logout */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700 font-medium">
              {user.name}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-20 pb-10 sm:px-6">
        {children}
      </main>
    </div>
  )
}

interface NavLinkProps {
  href: string
  current: string
  children: ReactNode
}

function NavLink({ href, current, children }: NavLinkProps) {
  const isActive =
    href === "/reports"
      ? current.startsWith("/reports")
      : href === "/customers"
        ? current.startsWith("/customers")
        : current.startsWith(href)

  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-blue-50 text-blue-700"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      {children}
    </Link>
  )
}
