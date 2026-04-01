import { NextResponse, type NextRequest } from 'next/server'
import { auth } from "@/auth"

export default auth((req) => {
  const isAuth = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith('/auth')
  const isDashboardPage = req.nextUrl.pathname.startsWith('/dashboard')

  if (isAuthPage) {
    if (isAuth) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return null
  }

  if (!isAuth && isDashboardPage) {
    let from = req.nextUrl.pathname;
    if (req.nextUrl.search) {
      from += req.nextUrl.search;
    }

    return NextResponse.redirect(
      new URL(`/auth/login?from=${encodeURIComponent(from)}`, req.url)
    )
  }
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 