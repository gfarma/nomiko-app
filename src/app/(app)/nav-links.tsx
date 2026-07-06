"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/constants";

const NAV: { href: string; label: string; roles?: Role[] }[] = [
  { href: "/dashboard", label: "Επισκόπηση" },
  { href: "/deadlines", label: "Προθεσμίες" },
  { href: "/cases", label: "Υποθέσεις" },
  { href: "/clients", label: "Πελάτες" },
  { href: "/time", label: "Χρόνος εργασίας" },
  { href: "/invoices", label: "Τιμολόγηση" },
  { href: "/leads", label: "Αιτήματα (Leads)" },
  { href: "/ai/notes", label: "AI Βοηθός" },
  { href: "/settings", label: "Ρυθμίσεις", roles: ["owner"] },
];

export function NavLinks({ role }: { role: Role }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      {NAV.filter((item) => !item.roles || item.roles.includes(role)).map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded px-3 py-2 text-sm transition-colors ${
              active ? "bg-white/10 text-white font-semibold" : "text-white/65 hover:text-white hover:bg-white/5"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
