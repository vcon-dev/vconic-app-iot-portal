import { Router, type IRouter } from "express";
import { db, usersTable, sessionsTable, passwordResetTokensTable } from "@workspace/db";
import { eq, and, gt, isNull } from "drizzle-orm";
import { hashPassword, verifyPassword, generateToken } from "../lib/auth";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import crypto from "crypto";
import { Resend } from "resend";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ error: "Missing required fields", message: "email, password, and name are required" });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "Validation error", message: "Password must be at least 8 characters" });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Conflict", message: "Email already registered" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(usersTable).values({ email, passwordHash, name }).returning();

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessionsTable).values({ userId: user.id, token, expiresAt });

  res.status(201).json({
    user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
    token,
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
    return;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
    return;
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessionsTable).values({ userId: user.id, token, expiresAt });

  res.json({
    user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
    token,
  });
});

router.post("/auth/logout", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.slice(7);
  await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  res.json({ success: true, message: "Logged out" });
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ id: user.id, email: user.email, name: user.name, createdAt: user.createdAt });
});

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: "Missing required fields", message: "email is required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (!user) {
    res.json({ success: true, message: "If that email is registered, a reset link will be provided." });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await db.insert(passwordResetTokensTable).values({ userId: user.id, token, expiresAt });

  const portalOrigin = (req.body.portalOrigin as string) || "";
  const resetUrl = portalOrigin
    ? `${portalOrigin}/reset-password?token=${token}`
    : `https://vconic.replit.app/reset-password?token=${token}`;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    const resend = new Resend(resendApiKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const { data, error } = await resend.emails.send({
      from: `vConic Portal <${fromEmail}>`,
      to: user.email,
      subject: "Reset your vConic password",
      html: `
        <div style="font-family:monospace;background:#111;color:#e5e5e5;padding:32px;border-radius:8px;max-width:480px;margin:0 auto;">
          <div style="color:#4ade80;font-size:18px;font-weight:bold;margin-bottom:8px;">vConic</div>
          <h2 style="color:#fff;font-size:20px;margin:0 0 16px;">Password Reset Request</h2>
          <p style="color:#aaa;font-size:14px;margin:0 0 24px;">
            We received a request to reset the password for your account (<strong style="color:#e5e5e5;">${user.email}</strong>).
            Click the button below to set a new password. This link expires in 1 hour.
          </p>
          <a href="${resetUrl}"
            style="display:inline-block;background:#4ade80;color:#111;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;letter-spacing:0.05em;">
            RESET PASSWORD
          </a>
          <p style="color:#555;font-size:12px;margin:24px 0 0;">
            If you didn't request this, you can safely ignore this email. Your password will not change.
          </p>
        </div>
      `,
    });
    if (error) {
      logger.error({ error, to: user.email, from: fromEmail }, "Resend: failed to send password reset email");
    } else {
      logger.info({ emailId: data?.id, to: user.email, from: fromEmail }, "Resend: password reset email sent");
    }
  } else {
    logger.warn("RESEND_API_KEY not set — skipping email send");
  }

  res.json({ success: true, message: "If that email is registered, a reset link has been sent." });
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { token, password } = req.body;

  if (!token || !password) {
    res.status(400).json({ error: "Missing required fields", message: "token and password are required" });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "Validation error", message: "Password must be at least 8 characters" });
    return;
  }

  const [resetRecord] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.token, token),
        isNull(passwordResetTokensTable.usedAt),
        gt(passwordResetTokensTable.expiresAt, new Date())
      )
    );

  if (!resetRecord) {
    res.status(400).json({ error: "Invalid token", message: "Reset link is invalid or has expired." });
    return;
  }

  const passwordHash = await hashPassword(password);

  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, resetRecord.userId));

  await db
    .update(passwordResetTokensTable)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokensTable.id, resetRecord.id));

  await db.delete(sessionsTable).where(eq(sessionsTable.userId, resetRecord.userId));

  res.json({ success: true, message: "Password updated successfully. All existing sessions have been invalidated." });
});

export default router;
