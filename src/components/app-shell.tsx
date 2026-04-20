"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ClipboardCheck, LayoutDashboard, FileText, Plus, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/reports/new", label: "New report", icon: Plus },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name?: string | null; email?: string | null; role?: string };
}) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-white md:flex">
        <div className="flex items-center gap-2.5 border-b px-5 py-5">
          <div className="rounded-lg bg-primary p-2 text-primary-foreground shadow-sm">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">QA Report Portal</div>
            <div className="text-[11px] text-muted-foreground">Daily test reports</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <div className="mb-3 rounded-lg bg-slate-50 p-3">
            <div className="truncate text-sm font-medium">{user.name ?? user.email}</div>
            <div className="truncate text-[11px] text-muted-foreground">{user.email}</div>
            {user.role && (
              <div className="mt-1 inline-block rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-700">
                {user.role}
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
