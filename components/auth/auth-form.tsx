"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icons } from "@/components/ui/icons"
import { useToast } from "@/hooks/use-toast"

interface AuthFormProps {
  type: "login" | "signup"
}

export function AuthForm({ type }: AuthFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    console.log("AuthForm mounted")
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const handleError = useCallback((error: Error) => {
    if (!mounted) return
    console.error("Auth error:", error)
    setError(error.message)
    setIsLoading(false)
  }, [mounted])

  const handleGoogleSignIn = useCallback(async () => {
    if (!mounted) return
    try {
      console.log("Starting Google sign in process...")
      setIsLoading(true)
      setError(null)
      
      console.log("Creating Supabase client...")
      const supabase = createClient()
      console.log("Supabase client created successfully")

      console.log("Initiating OAuth flow...")
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        console.error("OAuth error:", error)
        throw error
      }

      console.log("OAuth flow initiated successfully")
      toast({
        title: "Success",
        description: "Redirecting to Google...",
      })
    } catch (error) {
      console.error("Error in handleGoogleSignIn:", error)
      handleError(error as Error)
    }
  }, [mounted, handleError, toast])

  if (!mounted) return null

  return (
    <div className="grid gap-6">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {type === "login" ? "Welcome back" : "Create an account"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {type === "login"
            ? "Sign in to your account to continue"
            : "Enter your details to create your account"}
        </p>
      </div>

      <div className="grid gap-4">
        <Button
          variant="outline"
          type="button"
          disabled={isLoading}
          onClick={handleGoogleSignIn}
          className="w-full"
        >
          {isLoading ? (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Icons.google className="mr-2 h-4 w-4" />
          )}
          Continue with Google
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <p className="px-8 text-center text-sm text-muted-foreground">
        {type === "login" ? (
          <>
            Don&apos;t have an account?{" "}
            <a
              href="/auth/signup"
              className="underline underline-offset-4 hover:text-primary"
            >
              Sign up
            </a>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <a
              href="/auth/login"
              className="underline underline-offset-4 hover:text-primary"
            >
              Sign in
            </a>
          </>
        )}
      </p>
    </div>
  )
} 