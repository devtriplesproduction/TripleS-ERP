import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  outputFileTracingIncludes: {
    '/notes': ['./scratch/personal_notes_store.json'],
    '/quick-tasks': ['./scratch/quick_tasks_store.json'],
  },
};

export default nextConfig;
