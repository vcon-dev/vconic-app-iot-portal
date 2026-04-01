import { Router, type IRouter } from "express";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import path from "node:path";
import fs from "node:fs/promises";

const router: IRouter = Router();

const otaDir = () => path.resolve(process.cwd(), "ota-files");
const versionPath = () => path.join(otaDir(), "version.txt");
const firmwarePath = () => path.join(otaDir(), "firmware.bin");

// ─── Public device endpoints (no auth) ───────────────────────────────────────
// Devices poll these on boot. Must return correct Content-Length (no chunked
// encoding) so the ESP32 Update library can allocate flash space.

router.get("/ota/version.txt", async (_req, res): Promise<void> => {
  const version = await fs.readFile(versionPath(), "utf8").catch(() => null);
  if (!version) {
    res.status(404).type("text/plain").send("not found");
    return;
  }
  const body = version.trim();
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Length", Buffer.byteLength(body, "utf8"));
  res.status(200).send(body);
});

router.get("/ota/firmware.bin", async (_req, res): Promise<void> => {
  const firmwareStat = await fs.stat(firmwarePath()).catch(() => null);
  if (!firmwareStat) {
    res.status(404).type("text/plain").send("no firmware uploaded");
    return;
  }
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Length", firmwareStat.size);
  res.setHeader("Cache-Control", "no-store");
  const buf = await fs.readFile(firmwarePath());
  res.status(200).send(buf);
});

// ─── Admin endpoints (auth required) ─────────────────────────────────────────

router.get("/ota/status", requireAuth, async (_req: AuthRequest, res): Promise<void> => {
  const version = await fs.readFile(versionPath(), "utf8").then((v) => v.trim()).catch(() => null);
  const firmwareStat = await fs.stat(firmwarePath()).catch(() => null);
  res.json({
    version,
    firmwarePresent: !!firmwareStat,
    firmwareSize: firmwareStat?.size ?? null,
    firmwareModified: firmwareStat?.mtime ?? null,
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
  await fs.mkdir(otaDir(), { recursive: true });
  await fs.writeFile(versionPath(), trimmed, "utf8");
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
  await fs.mkdir(otaDir(), { recursive: true });
  await fs.writeFile(firmwarePath(), buf);
  res.json({ success: true, size: buf.length });
});

export default router;
