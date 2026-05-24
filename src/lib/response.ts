import { NextResponse } from "next/server"

export function apiOk<T>(data: T, status: 200 | 201 = 200): NextResponse {
  return NextResponse.json({ data }, { status })
}

export function apiError(
  code: string,
  message: string,
  status: 400 | 401 | 403 | 404 | 409 | 500 = 500
): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status })
}
