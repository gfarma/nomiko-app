/**
 * Static demo snapshot for GitHub Pages.
 *
 * Crawls the locally running production server (with an authenticated demo
 * session), saves every internal page as flat HTML (scripts stripped, forms
 * disabled), rewrites links/assets to relative paths and emits everything to
 * ./static-demo — ready to publish on the gh-pages branch.
 *
 * Usage:
 *   node .next/standalone/server.js  (PORT=3009, demo DB)
 *   node scripts/build-static-demo.mjs
 */
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const BASE = process.env.DEMO_BASE_URL || "http://127.0.0.1:3009";
const OUT = path.join(process.cwd(), "static-demo");
const EMAIL = "owner@demo.nomiko.gr";
const PASSWORD = "demo1234!";

const SEEDS = [
  "/login",
  "/dashboard",
  "/deadlines",
  "/deadlines?all=1",
  "/cases",
  "/cases/new",
  "/clients",
  "/clients/new",
  "/time",
  "/invoices",
  "/invoices/new",
  "/leads",
  "/ai/notes",
  "/settings",
  "/search",
  "/search?q=Τεχνική",
  "/papadopoulos-demo/contact",
];

const cookies = new Map();

function storeCookies(res) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(";");
    const eq = pair.indexOf("=");
    cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

function cookieHeader() {
  return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function get(url) {
  const res = await fetch(BASE + url, { headers: { cookie: cookieHeader() }, redirect: "follow" });
  storeCookies(res);
  return res;
}

async function login() {
  const csrfRes = await get("/api/auth/csrf");
  const { csrfToken } = await csrfRes.json();
  const body = new URLSearchParams({ csrfToken, email: EMAIL, password: PASSWORD });
  const res = await fetch(BASE + "/api/auth/callback/credentials", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: cookieHeader() },
    body,
    redirect: "manual",
  });
  storeCookies(res);
  const check = await get("/dashboard");
  const html = await check.text();
  if (!html.includes("Καλώς ήρθατε")) throw new Error("Login failed — dashboard not reachable");
  console.log("✓ Authenticated as demo owner");
}

/** /cases/abc?x=1 -> cases_abc_x-1.html ; /dashboard -> dashboard.html */
function flatName(urlPath) {
  const [p, q] = urlPath.split("?");
  let name = p.replace(/^\/+|\/+$/g, "").replace(/\//g, "_") || "index";
  if (q) name += "_" + q.replace(/[^a-zA-Z0-9]+/g, "-");
  return name + ".html";
}

function isInternalPage(href) {
  if (!href.startsWith("/")) return false;
  if (href.startsWith("//")) return false;
  if (href.startsWith("/_next") || href.startsWith("/api/") || href.startsWith("/favicon")) return false;
  return true;
}

const assets = new Set();

function processHtml(html, urlPath) {
  const found = [];

  // strip all scripts (turns the SSR output into a pure static mockup)
  html = html.replace(/<script\b[\s\S]*?<\/script>/gi, "");

  // collect asset urls (css, fonts, images)
  for (const m of html.matchAll(/(?:href|src)="(\/_next\/[^"]+)"/g)) assets.add(m[1]);

  // rewrite internal page links to flat html files
  html = html.replace(/href="(\/[^"]*)"/g, (full, href) => {
    if (href.startsWith("/_next") || href.startsWith("/favicon")) return `href="${href.slice(1)}"`;
    if (!isInternalPage(href)) return full;
    const clean = href.split("#")[0];
    found.push(clean);
    return `href="${flatName(clean)}"`;
  });

  // neutralize forms (no server behind GitHub Pages)
  html = html.replace(/<form\b/gi, '<form onsubmit="return false" ');

  // demo banner
  html = html.replace(
    /<body([^>]*)>/i,
    `<body$1><div style="background:#17222e;color:#f0e6cd;font:600 12px/1.4 sans-serif;text-align:center;padding:6px 12px;">ΣΤΑΤΙΚΟ DEMO (snapshot) — μόνο πλοήγηση, οι φόρμες/login δεν λειτουργούν. Πλαστά δεδομένα. Πηγή: github.com/gfarma/nomiko-app</div>`
  );

  return { html, found };
}

async function saveAsset(assetPath) {
  const res = await get(assetPath);
  if (!res.ok) return console.warn("  asset miss", assetPath, res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  let out = buf;
  if (assetPath.endsWith(".css")) {
    const css = buf.toString("utf8");
    // queue fonts/images referenced inside css (absolute OR relative form),
    // then make refs relative
    for (const m of css.matchAll(/\/_next\/static\/media\/[^)"' ]+/g)) assets.add(m[0]);
    for (const m of css.matchAll(/\.\.\/media\/([^)"' ]+)/g)) assets.add(`/_next/static/media/${m[1]}`);
    out = Buffer.from(css.replaceAll("/_next/static/media/", "../media/"), "utf8");
  }
  const target = path.join(OUT, assetPath.replace(/^\//, ""));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, out);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await login();

  const queue = [...SEEDS];
  const done = new Set();

  while (queue.length) {
    const urlPath = queue.shift();
    if (done.has(urlPath)) continue;
    done.add(urlPath);

    const res = await get(urlPath);
    const ct = res.headers.get("content-type") || "";
    if (!res.ok || !ct.includes("text/html")) {
      console.warn("skip", urlPath, res.status, ct);
      continue;
    }
    const raw = await res.text();
    const { html, found } = processHtml(raw, urlPath);
    await writeFile(path.join(OUT, flatName(urlPath)), html);
    console.log("✓", urlPath, "->", flatName(urlPath));
    for (const f of found) if (!done.has(f)) queue.push(f);
  }

  console.log(`Downloading assets…`);
  const savedAssets = new Set();
  while (savedAssets.size < assets.size) {
    for (const a of [...assets]) {
      if (savedAssets.has(a)) continue;
      savedAssets.add(a);
      await saveAsset(a); // may enqueue more (css -> fonts)
    }
  }

  // favicon + landing redirect
  const fav = await get("/favicon.ico");
  if (fav.ok) await writeFile(path.join(OUT, "favicon.ico"), Buffer.from(await fav.arrayBuffer()));
  await writeFile(
    path.join(OUT, "index.html"),
    `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=dashboard.html"><title>Nomiko demo</title><a href="dashboard.html">Άνοιγμα demo →</a>`
  );
  await writeFile(path.join(OUT, ".nojekyll"), "");

  console.log(`Done: ${done.size} pages -> ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
