"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, GraduationCap, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/ik/adaylar", label: "Adaylar", icon: Users },
  { href: "/ik/pozisyonlar", label: "Pozisyonlar", icon: Briefcase },
  { href: "/ik/yetkinlikler", label: "Yetkinlikler", icon: GraduationCap },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col gap-1 border-r border-input p-3">
      <p className="px-2.5 py-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        İK Paneli
      </p>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </aside>
  );
}
