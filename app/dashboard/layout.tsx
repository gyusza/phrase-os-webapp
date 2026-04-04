import DashboardHeader from "@/components/dashboard-header"
import { MobileNav } from "@/components/mobile-nav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <main className="flex-1 container py-6 pb-20 md:pb-6">
        {children}
      </main>
      <MobileNav />
    </div>
  )
} 