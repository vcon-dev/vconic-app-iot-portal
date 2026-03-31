import { Router, type IRouter } from "express";
import { db, devicesTable, vconsTable, rulesTable, activityTable } from "@workspace/db";
import { eq, and, count, sum, gte, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;

  const [deviceStats] = await db
    .select({
      total: count(),
      active: sql<number>`COUNT(CASE WHEN ${devicesTable.status} = 'active' THEN 1 END)`,
    })
    .from(devicesTable)
    .where(eq(devicesTable.userId, userId));

  const userDevices = await db
    .select({ id: devicesTable.id })
    .from(devicesTable)
    .where(eq(devicesTable.userId, userId));

  const deviceIds = userDevices.map((d) => d.id);

  let totalVcons = 0;
  let vconsToday = 0;
  let totalDuration = 0;
  let pendingReposts = 0;
  let failedReposts = 0;

  if (deviceIds.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const vconAgg = await db
      .select({
        total: count(),
        todayCount: sql<number>`COUNT(CASE WHEN ${vconsTable.createdAt} >= ${today.toISOString()} THEN 1 END)`,
        totalDur: sql<number>`COALESCE(SUM(${vconsTable.duration}), 0)`,
        pending: sql<number>`COUNT(CASE WHEN ${vconsTable.repostStatus} = 'pending' THEN 1 END)`,
        failed: sql<number>`COUNT(CASE WHEN ${vconsTable.repostStatus} = 'failed' THEN 1 END)`,
      })
      .from(vconsTable)
      .where(sql`${vconsTable.deviceId} = ANY(${sql.raw(`ARRAY['${deviceIds.join("','")}']::uuid[]`)})`);

    if (vconAgg[0]) {
      totalVcons = Number(vconAgg[0].total);
      vconsToday = Number(vconAgg[0].todayCount);
      totalDuration = Number(vconAgg[0].totalDur);
      pendingReposts = Number(vconAgg[0].pending);
      failedReposts = Number(vconAgg[0].failed);
    }
  }

  const [ruleStats] = await db
    .select({ active: sql<number>`COUNT(CASE WHEN ${rulesTable.enabled} = true THEN 1 END)` })
    .from(rulesTable)
    .where(eq(rulesTable.userId, userId));

  res.json({
    totalDevices: Number(deviceStats?.total ?? 0),
    activeDevices: Number(deviceStats?.active ?? 0),
    totalVcons,
    vconsToday,
    totalDuration,
    pendingReposts,
    failedReposts,
    activeRules: Number(ruleStats?.active ?? 0),
  });
});

router.get("/dashboard/recent", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const items = await db
    .select()
    .from(activityTable)
    .where(eq(activityTable.userId, req.userId!))
    .orderBy(sql`${activityTable.createdAt} DESC`)
    .limit(20);

  res.json({
    items: items.map((item) => ({
      id: item.id,
      type: item.type,
      message: item.message,
      deviceName: item.deviceName,
      vconId: item.vconId,
      createdAt: item.createdAt,
    })),
  });
});

export default router;
