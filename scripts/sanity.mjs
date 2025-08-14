// scripts/sanity.mjs
import { readFileSync } from "fs";
const main  = readFileSync("assets/main.js","utf8");
const game  = readFileSync("assets/poc-game.js","utf8");
const index = readFileSync("index.html","utf8");
const css   = readFileSync("styles/base.css","utf8");

function fail(msg){ console.error("❌", msg); process.exit(1); }
function ok(msg){ console.log("✅", msg); }

const orderOk = index.indexOf("assets/poc-game.js") < index.indexOf("assets/poc-ui.js") && index.indexOf("assets/poc-ui.js") < index.indexOf("assets/main.js");
if (!orderOk) fail("index.html script order must be: poc-game.js → poc-ui.js → main.js");
ok("Script order correct");

const versions = [...index.matchAll(/\?v=(v\d+\.\d+\.\d+)/g)].map(m=>m[1]);
const uniq = [...new Set(versions)];
if (uniq.length !== 1) fail(`index.html has inconsistent ?v= versions: ${uniq.join(", ")}`);
const V = uniq[0];
ok(`Version tag consistent: ${V}`);

const files = { "index.html": index, "styles/base.css": css, "assets/main.js": main, "assets/poc-game.js": game, "assets/poc-ui.js": readFileSync("assets/poc-ui.js","utf8") };
for (const [name, src] of Object.entries(files)) {
  if (!new RegExp(String.raw`build:\s*${V}`).test(src.split(/\n/).slice(0,3).join("\n"))) {
    fail(`Missing or wrong header in ${name} (expected build: ${V})`);
  }
}
ok("Headers match version");

for (const name of ["CARD_DEFS","SUPPLY","game"]) {
  if (new RegExp(String.raw`\b(var|let|const)?\s*${name}\s*=`).test(main))
    fail(`main.js must not declare/assign ${name}`);
}
ok("No game-data writes in main.js");

for (const fn of ["showTip","hideTip"]) {
  if (new RegExp(String.raw`function\s+${fn}\s*\(`).test(main))
    fail(`main.js should not define ${fn} (belongs in poc-ui.js)`);
}
ok("Tooltip handlers only in poc-ui.js");

if (!/#E5E7EB/.test(css)) fail("Expected #E5E7EB not found in styles/base.css");
ok("Card color applied");

console.log("All sanity checks passed.");
