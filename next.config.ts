import type { NextConfig } from "next";
import {
  resolveTongdokOrigin,
  tongdokRewriteRules,
} from "./src/lib/platform/tongdok-proxy";
import {
  resolveTrainingOrigin,
  trainingRewriteRules,
} from "./src/lib/platform/training-proxy";

const nextConfig: NextConfig = {
  experimental: {
    // 악보·교안 PDF가 서버 액션 기본 1MB를 넘으면 액션 전에 500이 난다.
    serverActions: { bodySizeLimit: "25mb" },
    proxyClientMaxBodySize: "25mb",
  },
  async rewrites() {
    const beforeFiles: { source: string; destination: string }[] = [];
    const afterFiles: { source: string; destination: string }[] = [
      { source: "/sorting-hat", destination: "/sorting-hat/index.html" },
    ];

    const trainingOrigin = resolveTrainingOrigin();
    if (trainingOrigin) {
      // beforeFiles: `/training.rsc`가 셸 App Router RSC로 잡히기 전에 upstream으로.
      beforeFiles.push(...trainingRewriteRules(trainingOrigin));
    }

    const tongdokOrigin = resolveTongdokOrigin();
    if (tongdokOrigin) {
      beforeFiles.push(...tongdokRewriteRules(tongdokOrigin));
    }

    return { beforeFiles, afterFiles };
  },
};

export default nextConfig;
