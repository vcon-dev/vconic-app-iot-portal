import { Router, type IRouter } from "express";
import { db, devicesTable, vconsTable, rulesTable, activityTable, unassignedVconsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const GATEWAY_DEFAULT_URL = "https://vcon-gateway.replit.app/ingress";

function extractDeviceIdentifier(payload: Record<string, unknown>): string | null {
  const parties = Array.isArray(payload.parties) ? payload.parties : [];
  if (parties.length > 0) {
    const party = parties[0] as Record<string, unknown>;
    const meta = (party.meta ?? {}) as Record<string, unknown>;
    if (meta.device_id && typeof meta.device_id === "string") return meta.device_id;
    if (meta.mac_address && typeof meta.mac_address === "string") return meta.mac_address;
    if (meta.deviceId && typeof meta.deviceId === "string") return meta.deviceId;
  }
  const meta = (payload.meta ?? {}) as Record<string, unknown>;
  if (meta.device_id && typeof meta.device_id === "string") return meta.device_id;
  if (meta.mac_address && typeof meta.mac_address === "string") return meta.mac_address;
  if (payload.device_id && typeof payload.device_id === "string") return payload.device_id;
  return null;
}

async function processRepostRules(
  vconId: string,
  deviceId: string,
  userId: string,
  vconPayload: unknown
): Promise<void> {
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
        await db.update(rulesTable).set({ successCount: sql`${rulesTable.successCount} + 1` }).where(eq(rulesTable.id, rule.id));
      } else {
        await db.update(rulesTable).set({ failureCount: sql`${rulesTable.failureCount} + 1` }).where(eq(rulesTable.id, rule.id));
        await db.update(vconsTable).set({ repostStatus: "failed", repostAttempts: sql`${vconsTable.repostAttempts} + 1` }).where(eq(vconsTable.id, vconId));
      }
    } catch (err) {
      logger.warn({ err, ruleId: rule.id, vconId }, "Repost failed");
      await db.update(rulesTable).set({ failureCount: sql`${rulesTable.failureCount} + 1` }).where(eq(rulesTable.id, rule.id));
      await db.update(vconsTable).set({ repostStatus: "failed", repostAttempts: sql`${vconsTable.repostAttempts} + 1` }).where(eq(vconsTable.id, vconId));
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

async function routeToDevice(device: typeof devicesTable.$inferSelect, payload: Record<string, unknown>, res: any): Promise<void> {
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
      vconUuid: (payload.uuid as string) || crypto.randomUUID(),
      vconVersion: (payload.vcon as string) ?? "0.4.0",
      subject: payload.subject as string | undefined,
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
    .set({ vconCount: sql`${devicesTable.vconCount} + 1`, lastSeenAt: new Date() })
    .where(eq(devicesTable.id, device.id));

  await db.insert(activityTable).values({
    userId: device.userId,
    type: "vcon_received",
    message: `vCon received via gateway from "${device.name}"`,
    deviceName: device.name,
    vconId: vcon.id,
  });

  processRepostRules(vcon.id, device.id, device.userId, payload).catch((err) => {
    logger.error({ err, vconId: vcon.id }, "Error processing repost rules");
  });

  res.status(202).json({
    status: "routed",
    id: vcon.id,
    uuid: vcon.vconUuid,
    deviceId: device.id,
    message: `vCon routed to device "${device.name}"`,
  });
}

router.get("/gateway/default-url", (_req, res) => {
  res.json({ url: GATEWAY_DEFAULT_URL });
});

router.post("/gateway", async (req, res): Promise<void> => {
  const payload = req.body as Record<string, unknown>;
  const sourceIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";

  if (!payload || typeof payload !== "object") {
    res.status(400).json({ error: "Bad Request", message: "Body must be a JSON object (vCon)" });
    return;
  }

  const tokenParam = (req.query.token as string) || (req.headers["x-device-token"] as string);

  if (tokenParam) {
    const [device] = await db.select().from(devicesTable).where(eq(devicesTable.token, tokenParam));
    if (device) {
      await routeToDevice(device, payload, res);
      return;
    }
    logger.warn({ token: tokenParam }, "Gateway: token provided but no matching device found, falling back to MAC lookup");
  }

  const deviceIdentifier = extractDeviceIdentifier(payload);

  if (deviceIdentifier) {
    const [device] = await db.select().from(devicesTable).where(eq(devicesTable.macAddress, deviceIdentifier));
    if (device) {
      await routeToDevice(device, payload, res);
      return;
    }
  }

  const identifier = deviceIdentifier || tokenParam || `unknown-${Date.now()}`;

  await db.insert(unassignedVconsTable).values({
    deviceIdentifier: identifier,
    sourceToken: tokenParam || null,
    sourceIp,
    vconUuid: (payload.uuid as string) || null,
    rawJson: JSON.stringify(payload),
    reason: tokenParam ? "token_no_match" : deviceIdentifier ? "mac_no_match" : "no_identifier",
  });

  logger.info({ identifier, hasToken: !!tokenParam, hasMac: !!deviceIdentifier }, "Gateway: vCon stored as unassigned");

  res.status(200).json({
    status: "unassigned",
    deviceIdentifier: identifier,
    message: "vCon accepted but no matching device found. Stored for manual assignment.",
  });
});

export default router;
