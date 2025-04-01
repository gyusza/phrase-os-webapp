"use client"

import { useSearchParams } from "next/navigation"
import { Icons } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const errorMessages = {
  "invalid-credentials": {
    title: "Invalid Credentials",
    message: "The email or password you entered is incorrect. Please try again.",
    action: "Try Again",
    href: "/auth/login",
  },
  "network-error": {
    title: "Network Error",
    message: "Unable to connect to the server. Please check your internet connection and try again.",
    action: "Retry",
    href: "/auth/login",
  },
  "session-expired": {
    title: "Session Expired",
    message: "Your session has expired. Please sign in again to continue.",
    action: "Sign In",
    href: "/auth/login",
  },
  "email-verification": {
    title: "Email Verification Required",
    message: "Please verify your email address before continuing. Check your inbox for the verification link.",
    action: "Resend Verification",
    href: "/auth/verify-email",
  },
  "default": {
    title: "Authentication Error",
    message: "An unexpected error occurred. Please try again later.",
    action: "Go Home",
    href: "/",
  },
}

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error") || "default"
  const errorInfo = errorMessages[error as keyof typeof errorMessages] || errorMessages.default

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <Icons.spinner className="mx-auto h-6 w-6 text-red-500" />
          <h1 className="text-2xl font-semibold tracking-tight text-red-500">
            {errorInfo.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {errorInfo.message}
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <Button asChild>
            <Link href={errorInfo.href}>
              {errorInfo.action}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              Return Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
} 