import { AuthForm } from "@/components/auth/auth-form"
import { Header } from "@/components/header"
import { Suspense } from "react"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header showNavigation={false} />
      <main className="flex-1 container flex items-center justify-center py-6">
        <div className="w-full max-w-sm">
          <Suspense fallback={<div>Loading form...</div>}>
            <AuthForm type="login" />
          </Suspense>
        </div>
      </main>
    </div>
  )
} 