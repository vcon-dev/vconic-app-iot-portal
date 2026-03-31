import { Router, type IRouter } from "express";
import { db, devicesTable, vconsTable, rulesTable, activityTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

async function processRepostRules(vconId: string, deviceId: string, userId: string, vconPayload: unknown): Promise<void> {
  const rules = await db
    .select()
    .from(rulesTable)
    .where(
      and(
        eq(rulesTable.userId, userId),
        eq(rulesTable.enabled, true),
        sql`(${rulesTable.deviceId} IS NULL OR ${rulesTable.deviceId} = ${deviceId}::uuid)`
      )
    );

  for (const rule of rules) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...((rule.headers as Record<string, string>) ?? {}),
      };

      const response = await fetch(rule.targetUrl, {
        method: rule.method,
        headers,
        body: JSON.stringify(vconPayload),
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        await db
          .update(rulesTable)
          .set({ successCount: sql`${rulesTable.successCount} + 1` })
          .where(eq(rulesTable.id, rule.id));
      } else {
        await db
          .update(rulesTable)
          .set({ failureCount: sql`${rulesTable.failureCount} + 1` })
          .where(eq(rulesTable.id, rule.id));

        await db
          .update(vconsTable)
          .set({ repostStatus: "failed", repostAttempts: sql`${vconsTable.repostAttempts} + 1` })
          .where(eq(vconsTable.id, vconId));
      }
    } catch (err) {
      logger.warn({ err, ruleId: rule.id, vconId }, "Repost failed");
      await db
        .update(rulesTable)
        .set({ failureCount: sql`${rulesTable.failureCount} + 1` })
        .where(eq(rulesTable.id, rule.id));

      await db
        .update(vconsTable)
        .set({ repostStatus: "failed", repostAttempts: sql`${vconsTable.repostAttempts} + 1` })
        .where(eq(vconsTable.id, vconId));
    }
  }

  if (rules.length > 0) {
    const [vcon] = await db.select({ repostStatus: vconsTable.repostStatus }).from(vconsTable).where(eq(vconsTable.id, vconId));
    if (vcon?.repostStatus === "pending") {
      await db.update(vconsTable).set({ repostStatus: "sent" }).where(eq(vconsTable.id, vconId));
    }
  } else {
    await db.update(vconsTable).set({ repostStatus: "skipped" }).where(eq(vconsTable.id, vconId));
  }
}

router.post("/ingest/:deviceToken", async (req, res): Promise<void> => {
  const deviceToken = Array.isArray(req.params.deviceToken) ? req.params.deviceToken[0] : req.params.deviceToken;
  const payload = req.body;

  const [device] = await db.select().from(devicesTable).where(eq(devicesTable.token, deviceToken));

  if (!device) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid device token" });
    return;
  }

  if (!payload.uuid || !payload.created_at) {
    res.status(400).json({ error: "Invalid vCon", message: "uuid and created_at are required" });
    return;
  }

  const parties = Array.isArray(payload.parties) ? payload.parties : [];
  const dialog = Array.isArray(payload.dialog) ? payload.dialog : [];
  const analysis = Array.isArray(payload.analysis) ? payload.analysis : [];
  const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];
  const extensions = Array.isArray(payload.extensions) ? payload.extensions : [];

  const totalDuration = dialog.reduce((sum: number, d: { duration?: number }) => sum + (d.duration ?? 0), 0);

  const [vcon] = await db
    .insert(vconsTable)
    .values({
      deviceId: device.id,
      vconUuid: payload.uuid,
      vconVersion: payload.vcon ?? "0.4.0",
      subject: payload.subject,
      parties,
      dialog,
      analysis,
      attachments,
      extensions,
      rawJson: JSON.stringify(payload),
      duration: totalDuration || null,
      partyCount: parties.length,
      hasAnalysis: analysis.length > 0 ? "true" : "false",
      hasAttachments: attachments.length > 0 ? "true" : "false",
      repostStatus: "pending",
    })
    .returning();

  await db
    .update(devicesTable)
    .set({
      vconCount: sql`${devicesTable.vconCount} + 1`,
      lastSeenAt: new Date(),
    })
    .where(eq(devicesTable.id, device.id));

  await db.insert(activityTable).values({
    userId: device.userId,
    type: "vcon_received",
    message: `vCon received from "${device.name}"`,
    deviceName: device.name,
    vconId: vcon.id,
  });

  processRepostRules(vcon.id, device.id, device.userId, payload).catch((err) => {
    logger.error({ err, vconId: vcon.id }, "Error processing repost rules");
  });

  res.status(202).json({ id: vcon.id, uuid: vcon.vconUuid, accepted: true, message: "vCon accepted" });
});

export default router;
