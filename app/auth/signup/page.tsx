"use client"

import { useEffect } from "react"
import { AuthForm } from "@/components/auth/auth-form"
import { Header } from "@/components/header"

export default function SignUpPage() {
  useEffect(() => {
    console.log("SignUpPage mounted")
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <Header showNavigation={false} />
      <main className="flex-1 container flex items-center justify-center py-6">
        <div className="w-full max-w-sm">
          <AuthForm type="signup" />
        </div>
      </main>
    </div>
  )
} 