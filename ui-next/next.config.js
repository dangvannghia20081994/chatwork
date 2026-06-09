/** @type {import('next').NextConfig} */
const nextConfig = {
  // Backend logic (spawn `claude`, read ~/.claude) runs only in Node route handlers.
  reactStrictMode: true,
};

module.exports = nextConfig;
