import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { signOut } from "@/lib/auth";
import { NavLinks } from "./nav-links";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const firm = await prisma.firm.findUnique({ where: { id: user.firmId }, select: { name: true, slug: true } });

  return (
    <div className="flex-1 flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-ink-deep text-paper flex flex-col sticky top-0 h-screen">
        <div className="px-5 pt-6 pb-4 border-b border-white/10">
          <Link href="/dashboard" className="font-display text-2xl font-semibold tracking-tight">
            Nomiko<span className="text-brass-pale">.</span>
          </Link>
          <p className="text-[11px] text-white/50 mt-1 leading-snug">{firm?.name ?? ""}</p>
        </div>

        <NavLinks role={user.role} />

        <div className="mt-auto px-5 py-4 border-t border-white/10 text-sm">
          <p className="font-semibold">{user.name}</p>
          <p className="text-white/50 text-xs mb-3">{ROLE_LABELS[user.role as Role]}</p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="text-white/70 hover:text-white text-xs underline underline-offset-2">Αποσύνδεση</button>
          </form>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 px-8 py-8 max-w-6xl">{children}</main>
    </div>
  );
}
