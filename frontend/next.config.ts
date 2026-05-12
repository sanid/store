import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "1337",
      },
      {
        protocol: "https",
        hostname: "*.strapiapp.com",
      },
      {
        protocol: "https",
        hostname: "*.up.railway.app",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
    qualities: [75],
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' js.stripe.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: http://localhost:1337 https://*.strapiapp.com https://*.up.railway.app https://res.cloudinary.com",
            "font-src 'self'",
            "frame-src js.stripe.com",
            "connect-src 'self' http://localhost:1337 https://*.strapiapp.com https://*.up.railway.app https://api.stripe.com",
          ].join("; "),
        },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ],
    },
  ],
};

export default withNextIntl(nextConfig);
