import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/floors", label: "Floors" },
  { href: "/admin/invitations", label: "Invitations" },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user?.email) {
    redirect("/")
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  if (!adminEmails.includes(session.user.email.toLowerCase())) {
    redirect("/")
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r bg-muted/40 p-4 flex flex-col gap-1">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1"
        >
          &larr; Back to Atlas
        </Link>

        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Admin
        </div>

        {ADMIN_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {link.label}
          </Link>
        ))}

        <div className="mt-auto pt-4 border-t text-xs text-muted-foreground truncate">
          {session.user.email}
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  )
}
