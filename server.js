
import express from "express";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";
import nodemailer from "nodemailer";
import crypto from "crypto";
import http from "http";
import https from "https";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4001;
const NODE_ENV = process.env.NODE_ENV || "development";
const GAME_THEME_URL = process.env.GAME_THEME_URL || ""; // optional remote CSS

const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const LOGINS_FILE = path.join(DATA_DIR, "login_events.json");
const VERIFY_FILE = path.join(DATA_DIR, "token_verify.json");
const RESET_FILE = path.join(DATA_DIR, "token_reset.json");
const OUTBOX_FILE = path.join(DATA_DIR, "emails.json");
const THEME_FILE = path.join(DATA_DIR, "theme.json");
const GAME_THEME_FILE = path.join(DATA_DIR, "game-theme.css");

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "devadmin"; // change in prod
const APP_NAME = process.env.APP_NAME || "Your Game";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Read version
const PKG = JSON.parse(await fs.readFile(path.join(__dirname, "package.json"), "utf-8"));
const VERSION = PKG.version || "1.0.0";

// Ensure data files
async function ensure(file, fallback) {
  try { await fs.access(file); } catch { await fs.writeFile(file, typeof fallback === "string" ? fallback : JSON.stringify(fallback, null, 2), "utf-8"); }
}
await fs.mkdir(DATA_DIR, { recursive: true });
await ensure(USERS_FILE, []);
await ensure(LOGINS_FILE, []);
await ensure(VERIFY_FILE, []);
await ensure(RESET_FILE, []);
await ensure(OUTBOX_FILE, []);
await ensure(THEME_FILE, {
  bg: "#0b0f14",
  surface: "#111827",
  surfaceAlt: "#0f1724",
  text: "#ecf2ff",
  muted: "rgba(236, 242, 255, 0.7)",
  border: "#2a2f39",
  accent: "#0ea5e9",
  accentContrast: "#0b0f14"
});
await ensure(GAME_THEME_FILE, `/* Paste your actual game CSS here. This file loads LAST and overrides everything. */`);

function getOrigin(req) {
  if (process.env.APP_ORIGIN) return process.env.APP_ORIGIN;
  const proto = (req.headers["x-forwarded-proto"] || "").split(",")[0] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

async function readJson(file) {
  const txt = await fs.readFile(file, "utf-8");
  try { return JSON.parse(txt || "[]"); } catch { return []; }
}
async function writeJson(file, data) {
  const tmp = file + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, file);
}
function nowIso() { return new Date().toISOString(); }
function requireAdmin(req, res, next) {
  const token = req.header("x-admin-token");
  if (!token || token !== ADMIN_TOKEN) return res.status(401).json({ error: "Unauthorized" });
  next();
}
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { algo: "scrypt", salt, hash };
}
function verifyPassword(password, rec) {
  if (!rec) return false;
  const hash = crypto.scryptSync(password, rec.salt, 64).toString("hex");
  return hash === rec.hash;
}

// Email
function getTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE || "false") === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}

async function sendEmail(to, subject, html) {
  const from = process.env.SMTP_FROM || `${APP_NAME} <no-reply@localhost>`;
  const transport = getTransport();
  if (transport) {
    try {
      const info = await transport.sendMail({ from, to, subject, html });
      return { id: info.messageId, queued: false };
    } catch (err) {
      // fall through to dev outbox
    }
  }
  const emails = await readJson(OUTBOX_FILE);
  const rec = { id: nanoid(), to, subject, html, created_at: nowIso() };
  emails.push(rec);
  await writeJson(OUTBOX_FILE, emails);
  return { id: rec.id, queued: true };
}

// Version
app.get("/api/version", (_req, res) => res.json({ version: VERSION, appName: APP_NAME }));

// Dynamic theme.css from JSON
app.get("/theme.css", async (_req, res) => {
  const t = await readJson(THEME_FILE);
  const d = {
    bg: t.bg || "#0b0f14",
    surface: t.surface || "#111827",
    surfaceAlt: t.surfaceAlt || "#0f1724",
    text: t.text || "#ecf2ff",
    muted: t.muted || "rgba(236, 242, 255, 0.7)",
    border: t.border || "#2a2f39",
    accent: t.accent || "#0ea5e9",
    accentContrast: t.accentContrast || "#0b0f14"
  };
  res.setHeader("Content-Type", "text/css");
  res.setHeader("Cache-Control", "no-store");
  res.send(`:root{
    --bg:${d.bg};
    --surface:${d.surface};
    --surface-alt:${d.surfaceAlt};
    --text:${d.text};
    --muted:${d.muted};
    --border:${d.border};
    --accent:${d.accent};
    --accent-contrast:${d.accentContrast};
    --btn-radius: 14px;
  }`);
});

// Optional remote or local game CSS (loads last)
app.get("/game-theme.css", async (_req, res) => {
  res.setHeader("Content-Type", "text/css");
  res.setHeader("Cache-Control", "no-store");
  if (GAME_THEME_URL) {
    try {
      const url = new URL(GAME_THEME_URL);
      const lib = url.protocol === "http:" ? http : https;
      lib.get(url, resp => {
        if (resp.statusCode !== 200) {
          resp.resume();
          fs.readFile(GAME_THEME_FILE, "utf-8").then(txt => res.send(txt));
          return;
        }
        let data = "";
        resp.setEncoding("utf8");
        resp.on("data", chunk => data += chunk);
        resp.on("end", () => res.send(data));
      }).on("error", async () => {
        const txt = await fs.readFile(GAME_THEME_FILE, "utf-8");
        res.send(txt);
      });
      return;
    } catch {}
  }
  const txt = await fs.readFile(GAME_THEME_FILE, "utf-8");
  res.send(txt);
});

// ---------- Auth flows ----------
app.post("/api/auth/signup", async (req, res) => {
  const { name, age, screenname, email } = req.body || {};
  if (!email || !name || !screenname || typeof age === "undefined") {
    return res.status(400).json({ error: "name, age, screenname, email required" });
  }
  const users = await readJson(USERS_FILE);
  const exists = users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
  if (exists) return res.status(409).json({ error: "email already exists" });

  const user = {
    id: nanoid(),
    name: String(name),
    age: Number(age),
    screenname: String(screenname),
    email: String(email),
    role: "user",
    created_at: nowIso(),
    email_verified: false,
    password: null,
    last_login_at: null,
    last_login_ip: null,
    last_login_ua: null,
    login_count: 0,
    last_seen_at: null
  };
  users.push(user);
  await writeJson(USERS_FILE, users);

  const verifyTokens = await readJson(VERIFY_FILE);
  const token = nanoid();
  verifyTokens.push({ token, user_id: user.id, created_at: nowIso(), used_at: null });
  await writeJson(VERIFY_FILE, verifyTokens);

  const origin = getOrigin(req);
  const link = `${origin}/verify.html?token=${encodeURIComponent(token)}`;
  await sendEmail(user.email, "Confirm your account", `<p>Hi ${user.name},</p><p>Click to confirm: <a href="${link}">${link}</a></p>`);

  const resp = { ok: true };
  if (NODE_ENV !== "production") resp.dev_verify_link = link;
  res.json(resp);
});

app.post("/api/auth/verify", async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: "token required" });
  const verifyTokens = await readJson(VERIFY_FILE);
  const vt = verifyTokens.find(t => t.token === token && !t.used_at);
  if (!vt) return res.status(400).json({ error: "invalid or used token" });
  const users = await readJson(USERS_FILE);
  const user = users.find(u => u.id === vt.user_id);
  if (!user) return res.status(404).json({ error: "user not found" });
  user.email_verified = true;
  await writeJson(USERS_FILE, users);
  vt.used_at = nowIso();
  await writeJson(VERIFY_FILE, verifyTokens);

  const resetTokens = await readJson(RESET_FILE);
  const rtoken = nanoid();
  resetTokens.push({ token: rtoken, user_id: user.id, created_at: nowIso(), used_at: null });
  await writeJson(RESET_FILE, resetTokens);

  const origin = getOrigin(req);
  const setLink = `${origin}/reset.html?token=${encodeURIComponent(rtoken)}`;
  await sendEmail(user.email, "Set your password", `<p>Hi ${user.name},</p><p>Set your password: <a href="${setLink}">${setLink}</a></p>`);

  const resp = { ok: true };
  if (NODE_ENV !== "production") resp.dev_set_password_link = setLink;
  res.json(resp);
});

app.post("/api/auth/set-password", async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ error: "token and password required" });
  const tokens = await readJson(RESET_FILE);
  const rt = tokens.find(t => t.token === token && !t.used_at);
  if (!rt) return res.status(400).json({ error: "invalid or used token" });

  const users = await readJson(USERS_FILE);
  const user = users.find(u => u.id === rt.user_id);
  if (!user) return res.status(404).json({ error: "user not found" });

  user.password = hashPassword(password);
  await writeJson(USERS_FILE, users);
  rt.used_at = nowIso();
  await writeJson(RESET_FILE, tokens);

  res.json({ ok: true });
});

app.post("/api/auth/request-reset", async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "email required" });
  const users = await readJson(USERS_FILE);
  const user = users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
  // Don't reveal user existence
  if (!user) return res.json({ ok: true });

  const resetTokens = await readJson(RESET_FILE);
  const token = nanoid();
  resetTokens.push({ token, user_id: user.id, created_at: nowIso(), used_at: null });
  await writeJson(RESET_FILE, resetTokens);

  const origin = getOrigin(req);
  const link = `${origin}/reset.html?token=${encodeURIComponent(token)}`;
  await sendEmail(user.email, "Reset your password", `<p>Hi ${user.name},</p><p>Reset here: <a href="${link}">${link}</a></p>`);

  res.json({ ok: true });
});

// Login tracking
app.post("/api/auth/login", async (req, res) => {
  const { email, password, method } = req.body || {};
  if (!email) return res.status(400).json({ error: "email required" });
  const users = await readJson(USERS_FILE);
  const user = users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
  const events = await readJson(LOGINS_FILE);

  if (!user) {
    events.push({ id: nanoid(), user_id: null, created_at: nowIso(), success: false, method: method || "password", ip: req.ip, user_agent: req.headers["user-agent"] || "", failure_reason: "user_not_found" });
    await writeJson(LOGINS_FILE, events);
    return res.status(404).json({ error: "user not found" });
  }

  if (password && user.password) {
    const ok = verifyPassword(password, user.password);
    if (!ok) {
      events.push({ id: nanoid(), user_id: user.id, created_at: nowIso(), success: false, method: "password", ip: req.ip, user_agent: req.headers["user-agent"] || "", failure_reason: "invalid_password" });
      await writeJson(LOGINS_FILE, events);
      return res.status(401).json({ error: "invalid password" });
    }
  }

  user.last_login_at = nowIso();
  user.last_login_ip = req.ip;
  user.last_login_ua = req.headers["user-agent"] || "";
  user.login_count = (user.login_count || 0) + 1;
  await writeJson(USERS_FILE, users);

  events.push({ id: nanoid(), user_id: user.id, created_at: nowIso(), success: true, method: method || "password", ip: req.ip, user_agent: req.headers["user-agent"] || "", failure_reason: null });
  await writeJson(LOGINS_FILE, events);

  res.json({ ok: true, user: { id: user.id, email: user.email, name: user.name, screenname: user.screenname, email_verified: user.email_verified } });
});

app.post("/api/heartbeat", async (req, res) => {
  const { user_id } = req.body || {};
  if (!user_id) return res.status(400).json({ error: "user_id required" });
  const users = await readJson(USERS_FILE);
  const user = users.find(u => u.id === user_id);
  if (!user) return res.status(404).json({ error: "user not found" });
  user.last_seen_at = nowIso();
  await writeJson(USERS_FILE, users);
  res.json({ ok: true });
});

// Admin
app.get("/api/admin/users", requireAdmin, async (_req, res) => {
  const users = await readJson(USERS_FILE);
  users.sort((a, b) => (b.last_login_at || "").localeCompare(a.last_login_at || ""));
  res.json({ users });
});
app.get("/api/admin/users/:id/logins", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const events = await readJson(LOGINS_FILE);
  const filtered = events.filter(e => e.user_id === id);
  filtered.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  res.json({ events: filtered });
});
app.post("/api/admin/users/:id/send-reset", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const users = await readJson(USERS_FILE);
  const user = users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: "user not found" });

  const resetTokens = await readJson(RESET_FILE);
  const token = nanoid();
  resetTokens.push({ token, user_id: user.id, created_at: nowIso(), used_at: null });
  await writeJson(RESET_FILE, resetTokens);

  const origin = getOrigin(req);
  const link = `${origin}/reset.html?token=${encodeURIComponent(token)}`;
  await sendEmail(user.email, "Reset your password", `<p>Hi ${user.name},</p><p>Reset here: <a href="${link}">${link}</a></p>`);

  const resp = { ok: true };
  if (NODE_ENV !== "production") resp.dev_reset_link = link;
  res.json(resp);
});
app.get("/api/admin/outbox", requireAdmin, async (_req, res) => {
  const emails = await readJson(OUTBOX_FILE);
  emails.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  res.json({ emails });
});

// ---------- Static pages ----------
app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "public", "home.html")));
app.get("/signup", (_req, res) => res.sendFile(path.join(__dirname, "public", "signup.html")));
app.get("/login", (_req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));
app.get("/forgot", (_req, res) => res.sendFile(path.join(__dirname, "public", "forgot.html")));
app.get("/verify.html", (_req, res) => res.sendFile(path.join(__dirname, "public", "verify.html")));
app.get("/reset.html", (_req, res) => res.sendFile(path.join(__dirname, "public", "reset.html")));
app.get("/records", (_req, res) => res.sendFile(path.join(__dirname, "public", "records.html")));
app.get("/achievements", (_req, res) => res.sendFile(path.join(__dirname, "public", "achievements.html")));
app.get("/play-ai", (_req, res) => res.sendFile(path.join(__dirname, "public", "play-ai.html")));
app.get("/play-pvp", (_req, res) => res.sendFile(path.join(__dirname, "public", "play-pvp.html")));
app.get("/admin", (_req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));

app.listen(PORT, () => {
  console.log(`${APP_NAME} admin v${VERSION} on :${PORT}`);
  console.log(`Admin token: ${ADMIN_TOKEN} (dev only)`);
  if (process.env.APP_ORIGIN) console.log(`APP_ORIGIN: ${process.env.APP_ORIGIN}`);
  if (GAME_THEME_URL) console.log(`Using GAME_THEME_URL: ${GAME_THEME_URL}`);
});
