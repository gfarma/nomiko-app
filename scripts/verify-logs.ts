/** Quick ops check: recent audit trail + AI interaction log + lead count. */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const logs = await p.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: { action: true, entityType: true, aiInvolved: true } });
  const ai = await p.aIInteractionLog.findMany({ select: { feature: true, model: true, reviewedByLawyer: true } });
  const leads = await p.lead.count();
  console.log(JSON.stringify({ recentAudit: logs, aiLogs: ai, leadCount: leads }, null, 1));
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
