import { Router, type IRouter } from "express";
import { db, devicesTable, vconsTable, activityTable, unassignedVconsTable } from "@workspace/db";
import { eq, and, desc, count, sql, or } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { generateDeviceToken } from "../lib/auth";
import { logger } from "../lib/logger";

async function claimUnassignedVcons(device: typeof devicesTable.$inferSelect): Promise<number> {
  const identifiers: string[] = [];
  if (device.vconicId) identifiers.push(device.vconicId);
  if (device.macAddress) identifiers.push(device.macAddress);
  if (identifiers.length === 0) return 0;

  const conditions = identifiers.map((id) => eq(unassignedVconsTable.deviceIdentifier, id));
  const unassigned = await db
    .select()
    .from(unassignedVconsTable)
    .where(conditions.length === 1 ? conditions[0] : or(...conditions));

  if (unassigned.length === 0) return 0;

  let migrated = 0;
  for (const row of unassigned) {
    try {
      const payload = JSON.parse(row.rawJson);
      const parties = Array.isArray(payload.parties) ? payload.parties : [];
      const dialog = Array.isArray(payload.dialog) ? payload.dialog : [];
      const analysis = Array.isArray(payload.analysis) ? payload.analysis : [];
      const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];
      const extensions = Array.isArray(payload.extensions) ? payload.extensions : [];
      const totalDuration = dialog.reduce((sum: number, d: { duration?: number }) => sum + (d.duration ?? 0), 0);

      await db.insert(vconsTable).values({
        deviceId: device.id,
        vconUuid: row.vconUuid || crypto.randomUUID(),
        vconVersion: payload.vcon ?? "0.4.0",
        subject: payload.subject,
        parties,
        dialog,
        analysis,
        attachments,
        extensions,
        rawJson: row.rawJson,
        duration: totalDuration || null,
        partyCount: parties.length,
        hasAnalysis: analysis.length > 0 ? "true" : "false",
        hasAttachments: attachments.length > 0 ? "true" : "false",
        repostStatus: "pending",
      });

      await db.delete(unassignedVconsTable).where(eq(unassignedVconsTable.id, row.id));
      migrated++;
    } catch (err) {
      logger.error({ err, rowId: row.id }, "Failed to auto-claim unassigned vCon during device registration");
    }
  }

  if (migrated > 0) {
    await db
      .update(devicesTable)
      .set({ vconCount: sql`${devicesTable.vconCount} + ${migrated}`, lastSeenAt: new Date() })
      .where(eq(devicesTable.id, device.id));

    await db.insert(activityTable).values({
      userId: device.userId,
      type: "vcon_received",
      message: `Auto-claimed ${migrated} queued vCon(s) for device "${device.name}"`,
      deviceName: device.name,
    });

    logger.info({ deviceId: device.id, deviceName: device.name, migrated }, "Auto-claimed unassigned vCons on device registration");
  }

  return migrated;
}

const router: IRouter = Router();

function getIngestUrl(token: string, req: AuthRequest): string {
  const host = req.get("host") ?? "localhost";
  const proto = req.get("x-forwarded-proto") ?? req.protocol;
  return `${proto}://${host}/api/ingest/${token}`;
}

router.get("/devices", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const devices = await db
    .select()
    .from(devicesTable)
    .where(eq(devicesTable.userId, req.userId!))
    .orderBy(desc(devicesTable.createdAt));

  const result = devices.map((d) => ({
    id: d.id,
    name: d.name,
    deviceType: d.deviceType,
    macAddress: d.macAddress,
    vconicId: d.vconicId,
    description: d.description,
    token: d.token,
    ingestUrl: getIngestUrl(d.token, req),
    status: d.status,
    vconCount: d.vconCount,
    lastSeenAt: d.lastSeenAt,
    createdAt: d.createdAt,
  }));

  res.json({ devices: result, total: result.length });
});

router.post("/devices", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { name, deviceType, macAddress, vconicId, description } = req.body;

  if (!name || !deviceType) {
    res.status(400).json({ error: "Missing required fields", message: "name and deviceType are required" });
    return;
  }

  const token = generateDeviceToken();

  const [device] = await db
    .insert(devicesTable)
    .values({ userId: req.userId!, name, deviceType, macAddress, vconicId: vconicId || null, description, token })
    .returning();

  await db.insert(activityTable).values({
    userId: req.userId!,
    type: "device_registered",
    message: `Device "${name}" registered`,
    deviceName: name,
  });

  // Auto-claim any unassigned vCons that match this device's vconicId or MAC address
  const vconsClaimed = await claimUnassignedVcons(device);

  res.status(201).json({
    id: device.id,
    name: device.name,
    deviceType: device.deviceType,
    macAddress: device.macAddress,
    vconicId: device.vconicId,
    description: device.description,
    token: device.token,
    ingestUrl: getIngestUrl(device.token, req),
    status: device.status,
    vconCount: device.vconCount,
    lastSeenAt: device.lastSeenAt,
    createdAt: device.createdAt,
    vconsClaimed,
  });
});

router.get("/devices/:deviceId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const deviceId = Array.isArray(req.params.deviceId) ? req.params.deviceId[0] : req.params.deviceId;

  const [device] = await db
    .select()
    .from(devicesTable)
    .where(and(eq(devicesTable.id, deviceId), eq(devicesTable.userId, req.userId!)));

  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  res.json({
    id: device.id,
    name: device.name,
    deviceType: device.deviceType,
    macAddress: device.macAddress,
    vconicId: device.vconicId,
    description: device.description,
    token: device.token,
    ingestUrl: getIngestUrl(device.token, req),
    status: device.status,
    vconCount: device.vconCount,
    lastSeenAt: device.lastSeenAt,
    createdAt: device.createdAt,
  });
});

router.put("/devices/:deviceId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const deviceId = Array.isArray(req.params.deviceId) ? req.params.deviceId[0] : req.params.deviceId;
  const { name, description, status, macAddress, vconicId } = req.body;

  const [device] = await db
    .update(devicesTable)
    .set({
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(status && { status }),
      ...(macAddress !== undefined && { macAddress }),
      ...(vconicId !== undefined && { vconicId: vconicId || null }),
    })
    .where(and(eq(devicesTable.id, deviceId), eq(devicesTable.userId, req.userId!)))
    .returning();

  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  // Auto-claim any newly-matching unassigned vCons after the update
  const vconsClaimed = await claimUnassignedVcons(device);

  res.json({
    id: device.id,
    name: device.name,
    deviceType: device.deviceType,
    macAddress: device.macAddress,
    vconicId: device.vconicId,
    description: device.description,
    token: device.token,
    ingestUrl: getIngestUrl(device.token, req),
    status: device.status,
    vconCount: device.vconCount,
    lastSeenAt: device.lastSeenAt,
    createdAt: device.createdAt,
    vconsClaimed,
  });
});

router.delete("/devices/:deviceId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const deviceId = Array.isArray(req.params.deviceId) ? req.params.deviceId[0] : req.params.deviceId;

  const [device] = await db
    .delete(devicesTable)
    .where(and(eq(devicesTable.id, deviceId), eq(devicesTable.userId, req.userId!)))
    .returning();

  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  res.json({ success: true, message: "Device deleted" });
});

router.post("/devices/:deviceId/token", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const deviceId = Array.isArray(req.params.deviceId) ? req.params.deviceId[0] : req.params.deviceId;

  const token = generateDeviceToken();

  const [device] = await db
    .update(devicesTable)
    .set({ token })
    .where(and(eq(devicesTable.id, deviceId), eq(devicesTable.userId, req.userId!)))
    .returning();

  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  res.json({
    token: device.token,
    ingestUrl: getIngestUrl(device.token, req),
  });
});

router.get("/devices/:deviceId/vcons", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const deviceId = Array.isArray(req.params.deviceId) ? req.params.deviceId[0] : req.params.deviceId;
  const limit = Number(req.query.limit) || 20;
  const offset = Number(req.query.offset) || 0;

  const [device] = await db
    .select({ id: devicesTable.id, name: devicesTable.name })
    .from(devicesTable)
    .where(and(eq(devicesTable.id, deviceId), eq(devicesTable.userId, req.userId!)));

  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  const vcons = await db
    .select()
    .from(vconsTable)
    .where(eq(vconsTable.deviceId, deviceId))
    .orderBy(desc(vconsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(vconsTable)
    .where(eq(vconsTable.deviceId, deviceId));

  const result = vcons.map((v) => ({
    id: v.id,
    uuid: v.vconUuid,
    deviceId: v.deviceId,
    deviceName: device.name,
    duration: v.duration,
    partyCount: v.partyCount,
    hasAnalysis: v.hasAnalysis === "true",
    hasAttachments: v.hasAttachments === "true",
    repostStatus: v.repostStatus,
    createdAt: v.createdAt,
  }));

  res.json({ vcons: result, total });
});

export default router;
