import { prisma } from "@/lib/prisma";

/**
 * Write an audit trail entry. Never throws — auditing must not break the
 * user-facing operation, but failures are logged for investigation.
 */
export async function audit(params: {
  firmId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  detail?: string;
  aiInvolved?: boolean;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        firmId: params.firmId,
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        detail: params.detail,
        aiInvolved: params.aiInvolved ?? false,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write audit log", params.action, err);
  }
}
