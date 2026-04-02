import { Router, type IRouter } from "express";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { db, otaFilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getOtaRow(key: string) {
  const [row] = await db.select().from(otaFilesTable).where(eq(otaFilesTable.key, key));
  return row ?? null;
}

async function upsertOtaRow(key: string, content: string, size: number) {
  await db
    .insert(otaFilesTable)
    .values({ key, content, size })
    .onConflictDoUpdate({
      target: otaFilesTable.key,
      set: { content, size, updatedAt: new Date() },
    });
}

// ─── Public device endpoints (no auth) ───────────────────────────────────────
// Devices poll these on boot. Explicit Content-Length (no chunked encoding)
// so the ESP32 Update library can allocate flash space correctly.

router.get("/ota/version.txt", async (_req, res): Promise<void> => {
  const row = await getOtaRow("version");
  if (!row) {
    res.status(404).type("text/plain").send("not found");
    return;
  }
  const body = row.content.trim();
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Length", Buffer.byteLength(body, "utf8"));
  res.status(200).send(body);
});

router.get("/ota/firmware.bin", async (_req, res): Promise<void> => {
  const row = await getOtaRow("firmware");
  if (!row) {
    res.status(404).type("text/plain").send("no firmware uploaded");
    return;
  }
  const buf = Buffer.from(row.content, "base64");
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Length", buf.length);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(buf);
});

// ─── Admin endpoints (auth required) ─────────────────────────────────────────

router.get("/ota/status", requireAuth, async (_req: AuthRequest, res): Promise<void> => {
  const [versionRow, firmwareRow] = await Promise.all([
    getOtaRow("version"),
    getOtaRow("firmware"),
  ]);
  res.json({
    version: versionRow?.content?.trim() ?? null,
    firmwarePresent: !!firmwareRow,
    firmwareSize: firmwareRow?.size ?? null,
    firmwareModified: firmwareRow?.updatedAt ?? null,
  });
});

router.put("/ota/version", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { version } = req.body;
  if (!version || typeof version !== "string") {
    res.status(400).json({ error: "version string required" });
    return;
  }
  const trimmed = version.trim();
  if (!/^\d+\.\d+\.\d+/.test(trimmed)) {
    res.status(400).json({ error: "version must be semver (e.g. 1.0.0)" });
    return;
  }
  await upsertOtaRow("version", trimmed, Buffer.byteLength(trimmed, "utf8"));
  res.json({ success: true, version: trimmed });
});

router.post("/ota/firmware", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { firmwareBase64 } = req.body;
  if (!firmwareBase64 || typeof firmwareBase64 !== "string") {
    res.status(400).json({ error: "firmwareBase64 required" });
    return;
  }
  let buf: Buffer;
  try {
    buf = Buffer.from(firmwareBase64, "base64");
  } catch {
    res.status(400).json({ error: "invalid base64 data" });
    return;
  }
  if (buf.length < 1024) {
    res.status(400).json({ error: "firmware too small — check the file" });
    return;
  }
  await upsertOtaRow("firmware", firmwareBase64, buf.length);
  res.json({ success: true, size: buf.length });
});

export default router;
