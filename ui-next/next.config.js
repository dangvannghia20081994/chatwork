/** @type {import('next').NextConfig} */

// When served behind the shared ngrok reverse proxy, this app lives under a path prefix
// (e.g. /ai) so a single ngrok domain can host two projects. basePath is baked at BUILD time,
// so set NEXT_PUBLIC_BASE_PATH in .env before `npm run build`. Empty = serve at root (standalone).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  // Backend logic (spawn `claude`, read ~/.claude) runs only in Node route handlers.
  reactStrictMode: true,
  ...(basePath ? { basePath } : {}),
};

module.exports = nextConfig;
