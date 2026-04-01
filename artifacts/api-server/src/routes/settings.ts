import { Router, type IRouter } from "express";
import { db, settingsTable, vconsTable, devicesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

async function getOrCreateSettings(userId: string) {
  const [existing] = await db.select().from(settingsTable).where(eq(settingsTable.userId, userId));
  if (existing) return existing;
  const [created] = await db.insert(settingsTable).values({ userId }).returning();
  return created;
}

router.get("/settings", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const settings = await getOrCreateSettings(req.userId!);

  const userDevices = await db
    .select({ id: devicesTable.id })
    .from(devicesTable)
    .where(eq(devicesTable.userId, req.userId!));
  const deviceIds = userDevices.map((d) => d.id);

  let vconCount = 0;
  if (deviceIds.length > 0) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(vconsTable)
      .where(sql`${vconsTable.deviceId} = ANY(${sql.raw(`ARRAY['${deviceIds.join("','")}']::uuid[]`)})`);
    vconCount = count;
  }

  res.json({
    maxVconCount: settings.maxVconCount,
    currentVconCount: vconCount,
    updatedAt: settings.updatedAt,
  });
});

router.put("/settings", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { maxVconCount } = req.body;

  if (maxVconCount !== undefined) {
    const val = Number(maxVconCount);
    if (!Number.isInteger(val) || val < 1 || val > 1_000_000) {
      res.status(400).json({ error: "maxVconCount must be an integer between 1 and 1,000,000" });
      return;
    }
  }

  const existing = await getOrCreateSettings(req.userId!);

  const [updated] = await db
    .update(settingsTable)
    .set({
      ...(maxVconCount !== undefined ? { maxVconCount: Number(maxVconCount) } : {}),
    })
    .where(eq(settingsTable.userId, req.userId!))
    .returning();

  res.json({
    maxVconCount: updated.maxVconCount,
    updatedAt: updated.updatedAt,
    message: "Settings saved",
  });
});

export { getOrCreateSettings };
export default router;
