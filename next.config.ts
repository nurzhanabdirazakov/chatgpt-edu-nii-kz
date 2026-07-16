import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/chatgpt-edu-nii-kz",
  assetPrefix: "/chatgpt-edu-nii-kz",
  images: { unoptimized: true },
};

export default nextConfig;
