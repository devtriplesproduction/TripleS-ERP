import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  outputFileTracingIncludes: {
    '/notes': ['./scratch/personal_notes_store.json'],
    '/quick-tasks': ['./scratch/quick_tasks_store.json'],
  },
  turbopack: {
    ignoreIssue: [
      {
        path: '**/lib/actions/**',
      },
      {
        path: /lib[\\/]actions[\\/]/,
      },
      {
        path: '**',
        title: /Dynamic filesystem access/,
      },
      {
        path: /.*/,
        title: /Dynamic filesystem access/,
      },
      {
        path: /.*/,
        description: /turbopackIgnore/,
      },
      {
        path: /.*/,
        description: /fs\.readFileSync/,
      },
    ],
  },
};

export default nextConfig;
