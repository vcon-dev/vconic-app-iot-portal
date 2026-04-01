import { Router, type IRouter } from "express";
import { db, devicesTable, vconsTable, unassignedVconsTable, usersTable, sessionsTable, activityTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { hashPassword, generateToken, generateDeviceToken } from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/admin/unassigned", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(unassignedVconsTable)
    .orderBy(desc(unassignedVconsTable.createdAt));

  const groupMap = new Map<string, {
    deviceIdentifier: string;
    vconCount: number;
    firstSeen: Date;
    lastSeen: Date;
    samplePartyName: string | undefined;
    recentVcons: Array<{ id: string; uuid: string | null; createdAt: Date }>;
  }>();

  for (const row of rows) {
    const key = row.deviceIdentifier;
    if (!groupMap.has(key)) {
      let samplePartyName: string | undefined;
      try {
        const parsed = JSON.parse(row.rawJson);
        const parties = Array.isArray(parsed.parties) ? parsed.parties : [];
        if (parties.length > 0 && parties[0].name) samplePartyName = parties[0].name;
      } catch {}

      groupMap.set(key, {
        deviceIdentifier: key,
        vconCount: 0,
        firstSeen: row.createdAt,
        lastSeen: row.createdAt,
        samplePartyName,
        recentVcons: [],
      });
    }

    const group = groupMap.get(key)!;
    group.vconCount++;
    if (row.createdAt < group.firstSeen) group.firstSeen = row.createdAt;
    if (row.createdAt > group.lastSeen) group.lastSeen = row.createdAt;
    if (group.recentVcons.length < 5) {
      group.recentVcons.push({ id: row.id, uuid: row.vconUuid, createdAt: row.createdAt });
    }
  }

  const groups = Array.from(groupMap.values()).sort(
    (a, b) => b.lastSeen.getTime() - a.lastSeen.getTime()
  );

  res.json({ groups, total: rows.length });
});

router.delete("/admin/unassigned/:deviceIdentifier", requireAuth, async (_req, res): Promise<void> => {
  const deviceIdentifier = decodeURIComponent(_req.params.deviceIdentifier);
  await db
    .delete(unassignedVconsTable)
    .where(eq(unassignedVconsTable.deviceIdentifier, deviceIdentifier));
  res.json({ success: true, message: `Removed all unassigned vCons for "${deviceIdentifier}"` });
});

router.post("/admin/unassigned/:deviceIdentifier/assign", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { deviceIdentifier } = req.params;
  const { deviceId } = req.body;

  if (!deviceId) {
    res.status(400).json({ error: "deviceId is required" });
    return;
  }

  const [device] = await db.select().from(devicesTable).where(eq(devicesTable.id, deviceId));
  if (!device || device.userId !== req.user!.id) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  const unassigned = await db
    .select()
    .from(unassignedVconsTable)
    .where(eq(unassignedVconsTable.deviceIdentifier, deviceIdentifier));

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
      logger.error({ err, rowId: row.id }, "Failed to migrate unassigned vCon");
    }
  }

  if (device.macAddress !== deviceIdentifier) {
    await db.update(devicesTable).set({ macAddress: deviceIdentifier, vconCount: sql`${devicesTable.vconCount} + ${migrated}` }).where(eq(devicesTable.id, device.id));
  } else {
    await db.update(devicesTable).set({ vconCount: sql`${devicesTable.vconCount} + ${migrated}` }).where(eq(devicesTable.id, device.id));
  }

  await db.insert(activityTable).values({
    userId: device.userId,
    type: "device_registered",
    message: `Assigned unassigned device "${deviceIdentifier}" to "${device.name}" (${migrated} vCons migrated)`,
    deviceName: device.name,
  });

  res.json({ success: true, vconsMigrated: migrated, deviceId: device.id, message: `${migrated} vCon(s) assigned to "${device.name}"` });
});

router.post("/admin/unassigned/:deviceIdentifier/create-account", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { deviceIdentifier } = req.params;
  const { name, email, password, deviceName, deviceType } = req.body;

  if (!name || !email || !password || !deviceName) {
    res.status(400).json({ error: "name, email, password, and deviceName are required" });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [newUser] = await db.insert(usersTable).values({ email, passwordHash, name }).returning();

  const sessionToken = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessionsTable).values({ userId: newUser.id, token: sessionToken, expiresAt });

  const deviceToken = generateDeviceToken();
  const [device] = await db
    .insert(devicesTable)
    .values({
      userId: newUser.id,
      name: deviceName,
      deviceType: deviceType ?? "m5stack-core2",
      macAddress: deviceIdentifier,
      token: deviceToken,
      status: "active",
    })
    .returning();

  const unassigned = await db
    .select()
    .from(unassignedVconsTable)
    .where(eq(unassignedVconsTable.deviceIdentifier, deviceIdentifier));

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
      logger.error({ err, rowId: row.id }, "Failed to migrate unassigned vCon");
    }
  }

  await db.update(devicesTable).set({ vconCount: migrated }).where(eq(devicesTable.id, device.id));

  await db.insert(activityTable).values({
    userId: newUser.id,
    type: "device_registered",
    message: `New account created for device "${deviceIdentifier}" (${migrated} vCons migrated)`,
    deviceName: device.name,
  });

  res.status(201).json({
    success: true,
    vconsMigrated: migrated,
    deviceId: device.id,
    userId: newUser.id,
    message: `Account created for ${email}, device "${deviceName}" registered (${migrated} vCons migrated)`,
  });
});

export default router;
