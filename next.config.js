/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  /* As requested */
  allowedDevOrigins: ['100.100.107.36', '192.168.1.128', '192.168.1.139', 'phraseos.gyula.dk'],
  /* Standard Next.js config for Server Actions from remote origins (Tailscale/LAN) */
  experimental: {
    serverActions: {
      allowedOrigins: ['100.100.107.36', '192.168.1.128', '192.168.1.139', 'phraseos.gyula.dk'],
    },
  },
};

module.exports = nextConfig;