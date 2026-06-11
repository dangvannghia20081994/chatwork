// HTTP Basic Auth gate (Next "proxy" convention, formerly middleware.js). Set UI_BASIC_AUTH="user:pass" in ui-next/.env
// to require login (recommended when exposed via ngrok). Empty = no auth (loopback dev only).
// Browsers cache Basic credentials and resend them on same-origin EventSource/fetch, so SSE works.
import { NextResponse } from "next/server";

export const config = {
  // Protect everything except Next's static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export function proxy(req) {
  const expected = process.env.UI_BASIC_AUTH || "";
  if (!expected) return NextResponse.next();

  const m = /^Basic (.+)$/.exec(req.headers.get("authorization") || "");
  if (m) {
    let got = "";
    try { got = atob(m[1]); } catch {}
    if (got === expected) return NextResponse.next();
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="ai-agent-ui", charset="UTF-8"' },
  });
}
