// Image upload for the chat console. Saves the file under .ai-uploads/ inside the chatted
// project's cwd (rezil | story) so the agent — which runs with that cwd — can Read it via a
// relative path. Mirrors elearning's /api/dev/upload. Gating is handled by the proxy Basic Auth.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { resolveProject } from "../../../../lib/config.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPLOAD_DIR = ".ai-uploads";
const MAX_BYTES = 15 * 1024 * 1024; // 15MB / file
const ALLOWED_TYPES = new Set([
  "image/png", "image/jpeg", "image/gif", "image/webp", "image/bmp", "image/svg+xml",
]);

// Keep the extension, strip odd chars → guards against path traversal & junk names.
function safeName(original) {
  const ext = path.extname(original).slice(0, 12).replace(/[^a-zA-Z0-9.]/g, "");
  const base =
    path.basename(original, path.extname(original)).replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 40) ||
    "img";
  return `${base}-${randomUUID().slice(0, 8)}${ext}`;
}

export async function POST(req) {
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project") === "story" ? "story" : "rezil";

  let form;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Yêu cầu không hợp lệ" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Thiếu tệp tải lên" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return Response.json({ error: "Chỉ hỗ trợ tệp ảnh (png/jpg/gif/webp…)" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Tệp quá lớn (tối đa 15MB)" }, { status: 400 });
  }

  const proj = resolveProject(project);
  const name = safeName(file.name || "img");
  const dir = path.join(proj.cwd, UPLOAD_DIR);
  await mkdir(dir, { recursive: true });
  // The target repo (rezil/story) is a different git repo — self-ignore the upload dir so an
  // edit-mode agent never accidentally commits a pasted screenshot. Idempotent.
  await writeFile(path.join(dir, ".gitignore"), "*\n!.gitignore\n").catch(() => {});
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, name), buf);

  // Relative to the agent's cwd → goes straight into the prompt for the Read tool.
  return Response.json({
    path: `${UPLOAD_DIR}/${name}`,
    name: file.name || name,
    size: file.size,
  });
}
