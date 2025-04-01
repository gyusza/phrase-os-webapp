import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: Request) {
  console.log("Auth callback route hit")
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    console.log("Auth code received")
    try {
      console.log("Creating redirect response")
      const response = NextResponse.redirect(new URL('/dashboard', request.url))
      
      console.log("Creating Supabase server client")
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.headers.get('cookie')?.split('; ').find(row => row.startsWith(`${name}=`))?.split('=')[1]
            },
            set(name: string, value: string, options: any) {
              response.cookies.set({
                name,
                value,
                ...options,
                path: '/',
                secure: process.env.NODE_ENV === 'production',
              })
            },
            remove(name: string, options: any) {
              response.cookies.delete({
                name,
                path: '/',
                ...options,
              })
            },
          },
        }
      )

      console.log("Exchanging code for session")
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        console.error("Error exchanging code for session:", error)
        throw error
      }
      console.log("Session exchange successful")
      return response
    } catch (error) {
      console.error('Error in auth callback:', error)
      return NextResponse.redirect(new URL('/auth/auth-error', request.url))
    }
  }

  console.log("No code received, redirecting to error page")
  return NextResponse.redirect(new URL('/auth/auth-error', request.url))
} 