import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["exceljs", "pdfkit"],
  // Vercel Node proxy/middleware has traced CJS @swc/helpers but required ESM at runtime.
  outputFileTracingIncludes: {
    "*": ["./node_modules/@swc/helpers/**/*"],
  },
};

export default nextConfig;
