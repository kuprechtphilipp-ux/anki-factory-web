import { Sidebar } from '@/components/sidebar'
import { ThemeToggle } from '@/components/theme-toggle'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-end border-b border-border/50 bg-card/60 px-5 backdrop-blur-sm">
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
