import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/notes': ['./scratch/personal_notes_store.json'],
    '/quick-tasks': ['./scratch/quick_tasks_store.json'],
  },
};

export default nextConfig;
