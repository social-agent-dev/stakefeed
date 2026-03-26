import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@stakefeed/shared", "@stakefeed/sdk"],
};

export default nextConfig;
