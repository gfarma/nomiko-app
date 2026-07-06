import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LEGAL_CONTENT_ROLES, type Role } from "@/lib/constants";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  firmId: string;
};

/**
 * Every server component / server action that touches firm data MUST go
 * through this helper. It guarantees an authenticated user and returns the
 * firmId used to scope EVERY query (multi-tenant row isolation).
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user as SessionUser;
}

export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}

export function canSeeLegalContent(role: Role): boolean {
  return LEGAL_CONTENT_ROLES.includes(role);
}
