"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, BarChart2, Settings, Target, Sparkles, User } from 'lucide-react'
import { useSession } from "next-auth/react"

export function MobileNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  
  const isAdmin = session?.user?.id === "69582ce4-c873-4a07-923b-16fc6dddf577"

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: BarChart2 },
    { name: "Scenarios", href: "/dashboard/scenarios", icon: Sparkles },
    { name: "Vocabulary", href: "/dashboard/vocabulary", icon: BookOpen },
    { name: "Practice", href: "/dashboard/practice", icon: Target },
    ...(isAdmin ? [{ name: "Admin", href: "/dashboard/admin/signups", icon: User }] : []),
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ]

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.08)] transition-all">
      <nav className="flex items-center justify-around h-16 px-2">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all active:scale-90 ${
                isActive ? "text-primary" : "text-muted-foreground/60"
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-primary/10 scale-110" : "hover:bg-muted"}`}>
                <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5px]" : "stroke-[2px]"}`} aria-hidden="true" />
              </div>
              <span className={`text-xs font-bold tracking-tight ${isActive ? "opacity-100" : "opacity-80"}`}>{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
