import Link from "next/link"
import { Mic } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface HeaderProps {
  showNavigation?: boolean
}

export function Header({ showNavigation = true }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-primary" />
          <span className="font-bold">PhraseOS</span>
        </Link>

        {showNavigation && (
          <>
            <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
              <nav className="flex items-center space-x-6">
                <Link
                  href="/features"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  Features
                </Link>
                <Link
                  href="/pricing"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  Pricing
                </Link>
                <Link
                  href="/about"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  About
                </Link>
              </nav>
              <div className="flex items-center space-x-4">
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">
                    Sign in
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm">Get started</Button>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  )
} 