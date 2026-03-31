import { Router, type IRouter } from "express";
import { db, vconsTable, devicesTable, activityTable } from "@workspace/db";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/vcons", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const limit = Number(req.query.limit) || 20;
  const offset = Number(req.query.offset) || 0;

  const userDevices = await db
    .select({ id: devicesTable.id, name: devicesTable.name })
    .from(devicesTable)
    .where(eq(devicesTable.userId, req.userId!));

  const deviceIds = userDevices.map((d) => d.id);
  const deviceMap = new Map(userDevices.map((d) => [d.id, d.name]));

  if (deviceIds.length === 0) {
    res.json({ vcons: [], total: 0 });
    return;
  }

  const vcons = await db
    .select()
    .from(vconsTable)
    .where(sql`${vconsTable.deviceId} = ANY(${sql.raw(`ARRAY['${deviceIds.join("','")}']::uuid[]`)})`)
    .orderBy(desc(vconsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(vconsTable)
    .where(sql`${vconsTable.deviceId} = ANY(${sql.raw(`ARRAY['${deviceIds.join("','")}']::uuid[]`)})`);

  const result = vcons.map((v) => ({
    id: v.id,
    uuid: v.vconUuid,
    deviceId: v.deviceId,
    deviceName: deviceMap.get(v.deviceId) ?? "Unknown",
    duration: v.duration,
    partyCount: v.partyCount,
    hasAnalysis: v.hasAnalysis === "true",
    hasAttachments: v.hasAttachments === "true",
    repostStatus: v.repostStatus,
    createdAt: v.createdAt,
  }));

  res.json({ vcons: result, total });
});

router.get("/vcons/:vconId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const vconId = Array.isArray(req.params.vconId) ? req.params.vconId[0] : req.params.vconId;

  const [vcon] = await db.select().from(vconsTable).where(eq(vconsTable.id, vconId));
  if (!vcon) {
    res.status(404).json({ error: "vCon not found" });
    return;
  }

  const [device] = await db
    .select({ id: devicesTable.id, name: devicesTable.name, userId: devicesTable.userId })
    .from(devicesTable)
    .where(eq(devicesTable.id, vcon.deviceId));

  if (!device || device.userId !== req.userId) {
    res.status(404).json({ error: "vCon not found" });
    return;
  }

  res.json({
    id: vcon.id,
    uuid: vcon.vconUuid,
    deviceId: vcon.deviceId,
    deviceName: device.name,
    vconVersion: vcon.vconVersion,
    subject: vcon.subject,
    parties: vcon.parties,
    dialog: vcon.dialog,
    analysis: vcon.analysis,
    attachments: vcon.attachments,
    repostStatus: vcon.repostStatus,
    repostAttempts: vcon.repostAttempts,
    rawJson: vcon.rawJson,
    createdAt: vcon.createdAt,
  });
});

router.delete("/vcons/:vconId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const vconId = Array.isArray(req.params.vconId) ? req.params.vconId[0] : req.params.vconId;

  const [vcon] = await db.select().from(vconsTable).where(eq(vconsTable.id, vconId));
  if (!vcon) {
    res.status(404).json({ error: "vCon not found" });
    return;
  }

  const [device] = await db
    .select({ userId: devicesTable.userId })
    .from(devicesTable)
    .where(eq(devicesTable.id, vcon.deviceId));

  if (!device || device.userId !== req.userId) {
    res.status(404).json({ error: "vCon not found" });
    return;
  }

  await db.delete(vconsTable).where(eq(vconsTable.id, vconId));

  await db
    .update(devicesTable)
    .set({ vconCount: sql`${devicesTable.vconCount} - 1` })
    .where(eq(devicesTable.id, vcon.deviceId));

  res.json({ success: true, message: "vCon deleted" });
});

export default router;
