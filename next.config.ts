import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse / mammoth はfsを直接使うためwebpackバンドルから除外する
  serverExternalPackages: ["pdf-parse", "mammoth", "xlsx"],
};

export default nextConfig;
