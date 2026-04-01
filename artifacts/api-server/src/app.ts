import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// OTA static files — served publicly with no auth, no compression.
// firmware.bin requires an accurate Content-Length so the ESP32 Update
// library can allocate flash space correctly; express.static sends it automatically.
const publicDir = path.resolve(process.cwd(), "public");
app.use(express.static(publicDir, {
  etag: true,
  lastModified: true,
  setHeaders(res, filePath) {
    if (filePath.endsWith("firmware.bin")) {
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Cache-Control", "no-store");
    }
    if (filePath.endsWith("version.txt")) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
    }
  },
}));

app.use((req, _res, next) => {
  if (req.path === "/ingress") {
    req.url = "/api/gateway" + req.url.slice("/ingress".length);
  }
  next();
});

app.use("/api", router);

export default app;
