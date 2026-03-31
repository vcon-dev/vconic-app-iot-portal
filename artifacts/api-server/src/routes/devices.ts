import { Router, type IRouter } from "express";
import { db, devicesTable, vconsTable, activityTable } from "@workspace/db";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { generateDeviceToken } from "../lib/auth";

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
  const { name, deviceType, macAddress, description } = req.body;

  if (!name || !deviceType) {
    res.status(400).json({ error: "Missing required fields", message: "name and deviceType are required" });
    return;
  }

  const token = generateDeviceToken();

  const [device] = await db
    .insert(devicesTable)
    .values({ userId: req.userId!, name, deviceType, macAddress, description, token })
    .returning();

  await db.insert(activityTable).values({
    userId: req.userId!,
    type: "device_registered",
    message: `Device "${name}" registered`,
    deviceName: name,
  });

  res.status(201).json({
    id: device.id,
    name: device.name,
    deviceType: device.deviceType,
    macAddress: device.macAddress,
    description: device.description,
    token: device.token,
    ingestUrl: getIngestUrl(device.token, req),
    status: device.status,
    vconCount: device.vconCount,
    lastSeenAt: device.lastSeenAt,
    createdAt: device.createdAt,
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
  const { name, description, status } = req.body;

  const [device] = await db
    .update(devicesTable)
    .set({ ...(name && { name }), ...(description !== undefined && { description }), ...(status && { status }) })
    .where(and(eq(devicesTable.id, deviceId), eq(devicesTable.userId, req.userId!)))
    .returning();

  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  res.json({
    id: device.id,
    name: device.name,
    deviceType: device.deviceType,
    macAddress: device.macAddress,
    description: device.description,
    token: device.token,
    ingestUrl: getIngestUrl(device.token, req),
    status: device.status,
    vconCount: device.vconCount,
    lastSeenAt: device.lastSeenAt,
    createdAt: device.createdAt,
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
