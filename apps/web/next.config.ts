import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@95forward/shared", "@95forward/db"],
};

export default nextConfig;
