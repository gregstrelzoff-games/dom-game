
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const LOGINS_FILE = path.join(DATA_DIR, "login_events.json");
const OUTBOX_FILE = path.join(DATA_DIR, "emails.json");

function randInt(n){ return Math.floor(Math.random() * n); }
function daysAgo(n){ const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); }

await fs.mkdir(DATA_DIR, { recursive: true });

const demoUsers = [
  { name: "Alice", age: 28, screenname: "starforge", email: "alice@example.com" },
  { name: "Bob", age: 35, screenname: "riverstone", email: "bob@example.com" },
  { name: "Carol", age: 31, screenname: "sunshadow", email: "carol@example.com" }
].map((u, i) => ({
  id: nanoid(),
  ...u,
  role: "user",
  created_at: daysAgo(15 - i * 3),
  email_verified: true,
  password: null,
  last_login_at: daysAgo(randInt(10)),
  last_login_ip: "127.0.0.1",
  last_login_ua: "seed/1.0",
  login_count: 1 + randInt(12),
  last_seen_at: null
}));

await fs.writeFile(USERS_FILE, JSON.stringify(demoUsers, null, 2), "utf-8");
await fs.writeFile(LOGINS_FILE, "[]", "utf-8");
await fs.writeFile(OUTBOX_FILE, "[]", "utf-8");

console.log("Seeded users.");
