"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icons } from "@/components/ui/icons"
import { loginAction } from "@/lib/actions/auth"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface AuthFormProps {
  type: "login" | "signup"
}

export function AuthForm({ type }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const res = await loginAction(formData)
    
    // loginAction throws redirect on success, so if it returns, it's an error
    if (res?.error) {
      setError(res.error)
      setIsLoading(false)
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in using local credentials
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="username">Username</Label>
          <Input id="username" name="username" placeholder="admin or guest" required disabled={isLoading} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required disabled={isLoading} />
        </div>
        <Button disabled={isLoading}>
          {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
          Sign In
        </Button>
      </form>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="text-center text-sm text-muted-foreground mt-4 border-t pt-4">
        <p>Use <b>admin</b> / <b>admin</b> to view migrated data.</p>
        <p>Use <b>guest</b> / <b>guest</b> for a testing account.</p>
      </div>
    </div>
  )
}