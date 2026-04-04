"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Mic, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react"
import { submitSignupRequest } from "@/lib/actions/auth-actions"
import { useToast } from "@/hooks/use-toast"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [isPending, setIsPending] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return

    setIsPending(true)
    try {
      const result = await submitSignupRequest(email)
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        setIsSubmitted(true)
        toast({
          title: "Request Sent!",
          description: "We've received your signup request.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4 md:p-8">
      <Link href="/" className="fixed top-8 left-8 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>
      
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex items-center gap-2">
            <Mic className="h-10 w-10 text-primary" />
            <span className="text-3xl font-bold tracking-tight">PhraseOS</span>
          </div>
          <p className="text-muted-foreground mt-2">Join our language learning beta</p>
        </div>

        <Card className="border-2 shadow-lg">
          <CardHeader className="space-y-1 pt-8">
            <CardTitle className="text-2xl text-center">Request Access</CardTitle>
            <CardDescription className="text-center">
              Enter your email below to request an account. We'll contact you once we're ready!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSubmitted ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-4 text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-xl">Request Submitted!</h3>
                  <p className="text-sm text-muted-foreground max-w-[250px] mx-auto">
                    Thanks for your interest! We'll reach out to you at <span className="font-medium text-foreground">{email}</span> soon.
                  </p>
                </div>
                <Button variant="outline" className="mt-4" onClick={() => router.push('/')}>
                  Return to Home
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@example.com" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 text-lg"
                    disabled={isPending}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 text-lg font-semibold" 
                  disabled={isPending || !email}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Join the Waitlist"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
          {!isSubmitted && (
             <CardFooter className="flex flex-col space-y-4 border-t bg-muted/20 py-6">
                <div className="text-sm text-center text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="font-medium text-primary hover:underline underline-offset-4">
                    Sign In
                  </Link>
                </div>
             </CardFooter>
          )}
        </Card>
        
        <p className="px-8 text-center text-xs text-muted-foreground leading-relaxed">
          By clicking join, you agree to our terms of service and our commitment to making you a language pro.
        </p>
      </div>
    </div>
  )
}
