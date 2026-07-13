// Serves screenshot PNGs written at runtime by scripts/snapshot.mjs into ui-next/.snapshots/.
// Why a route handler (not the public/ folder): Next 16 + turbopack bakes the public/ file list at
// build time, so `next start` does NOT serve files added to public/ afterwards. Route handlers run
// per-request, so a freshly captured image is served immediately with no rebuild.
// Auth: this path goes through proxy.js Basic Auth like everything else; the browser resends the
// cached credentials on the <img> request (same mechanism that lets SSE work behind the auth gate).
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// pm2 runs this app with cwd = ui-next (ecosystem.config.js), matching snapshot.mjs's OUT_DIR.
const DIR = path.join(process.cwd(), ".snapshots");

export async function GET(_req, { params }) {
  const { name } = await params;
  // Only bare PNG filenames — blocks path traversal / directory escapes.
  if (!/^[a-zA-Z0-9._-]+\.png$/.test(name || "")) {
    return new Response("bad name", { status: 400 });
  }
  try {
    const buf = await readFile(path.join(DIR, name));
    return new Response(buf, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
