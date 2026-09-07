import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["imac-von-sanid.local", "192.168.0.88"],
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
  headers: async () => {
    const isDev = process.env.NODE_ENV !== "production";
    // 'unsafe-eval' is required by Next's dev runtime / React Refresh but MUST be off in prod.
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' js.stripe.com"
      : "script-src 'self' 'unsafe-inline' js.stripe.com";
    const imgSrc = isDev
      ? "img-src 'self' data: blob: http://localhost:1337 https://*.strapiapp.com https://*.up.railway.app https://res.cloudinary.com"
      : "img-src 'self' data: blob: https://*.strapiapp.com https://*.up.railway.app https://res.cloudinary.com";
    // `blob:` is required by three.js: glTF textures are embedded in the file,
    // and the loader fetches them back out through a blob URL it created itself.
    const connectSrc = isDev
      ? "connect-src 'self' blob: http://localhost:1337 https://*.strapiapp.com https://*.up.railway.app https://api.stripe.com"
      : "connect-src 'self' blob: https://*.strapiapp.com https://*.up.railway.app https://api.stripe.com";

    return [
    {
      source: "/(.*)",
      headers: [
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            scriptSrc,
            "style-src 'self' 'unsafe-inline'",
            imgSrc,
            "font-src 'self'",
            "frame-src js.stripe.com",
            connectSrc,
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
  ];
  },
};

export default withNextIntl(nextConfig);
