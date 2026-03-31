import { Router, type IRouter } from "express";
import { db, rulesTable, devicesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

async function enrichRule(rule: typeof rulesTable.$inferSelect, userId: string) {
  let deviceName: string | undefined;
  if (rule.deviceId) {
    const [device] = await db
      .select({ name: devicesTable.name })
      .from(devicesTable)
      .where(and(eq(devicesTable.id, rule.deviceId), eq(devicesTable.userId, userId)));
    deviceName = device?.name;
  }

  return {
    id: rule.id,
    name: rule.name,
    deviceId: rule.deviceId,
    deviceName,
    targetUrl: rule.targetUrl,
    method: rule.method,
    headers: rule.headers,
    filterCondition: rule.filterCondition,
    enabled: rule.enabled,
    successCount: rule.successCount,
    failureCount: rule.failureCount,
    createdAt: rule.createdAt,
  };
}

router.get("/rules", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const rules = await db
    .select()
    .from(rulesTable)
    .where(eq(rulesTable.userId, req.userId!))
    .orderBy(desc(rulesTable.createdAt));

  const enriched = await Promise.all(rules.map((r) => enrichRule(r, req.userId!)));
  res.json({ rules: enriched, total: enriched.length });
});

router.post("/rules", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { name, deviceId, targetUrl, method = "POST", headers = {}, filterCondition, enabled = true } = req.body;

  if (!name || !targetUrl) {
    res.status(400).json({ error: "Missing required fields", message: "name and targetUrl are required" });
    return;
  }

  if (deviceId) {
    const [device] = await db
      .select({ id: devicesTable.id })
      .from(devicesTable)
      .where(and(eq(devicesTable.id, deviceId), eq(devicesTable.userId, req.userId!)));
    if (!device) {
      res.status(400).json({ error: "Device not found" });
      return;
    }
  }

  const [rule] = await db
    .insert(rulesTable)
    .values({ userId: req.userId!, name, deviceId: deviceId ?? null, targetUrl, method, headers, filterCondition, enabled })
    .returning();

  const enriched = await enrichRule(rule, req.userId!);
  res.status(201).json(enriched);
});

router.get("/rules/:ruleId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const ruleId = Array.isArray(req.params.ruleId) ? req.params.ruleId[0] : req.params.ruleId;

  const [rule] = await db
    .select()
    .from(rulesTable)
    .where(and(eq(rulesTable.id, ruleId), eq(rulesTable.userId, req.userId!)));

  if (!rule) {
    res.status(404).json({ error: "Rule not found" });
    return;
  }

  const enriched = await enrichRule(rule, req.userId!);
  res.json(enriched);
});

router.put("/rules/:ruleId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const ruleId = Array.isArray(req.params.ruleId) ? req.params.ruleId[0] : req.params.ruleId;
  const { name, targetUrl, method, headers, filterCondition, enabled } = req.body;

  const [rule] = await db
    .update(rulesTable)
    .set({
      ...(name !== undefined && { name }),
      ...(targetUrl !== undefined && { targetUrl }),
      ...(method !== undefined && { method }),
      ...(headers !== undefined && { headers }),
      ...(filterCondition !== undefined && { filterCondition }),
      ...(enabled !== undefined && { enabled }),
    })
    .where(and(eq(rulesTable.id, ruleId), eq(rulesTable.userId, req.userId!)))
    .returning();

  if (!rule) {
    res.status(404).json({ error: "Rule not found" });
    return;
  }

  const enriched = await enrichRule(rule, req.userId!);
  res.json(enriched);
});

router.delete("/rules/:ruleId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const ruleId = Array.isArray(req.params.ruleId) ? req.params.ruleId[0] : req.params.ruleId;

  const [rule] = await db
    .delete(rulesTable)
    .where(and(eq(rulesTable.id, ruleId), eq(rulesTable.userId, req.userId!)))
    .returning();

  if (!rule) {
    res.status(404).json({ error: "Rule not found" });
    return;
  }

  res.json({ success: true, message: "Rule deleted" });
});

export default router;
