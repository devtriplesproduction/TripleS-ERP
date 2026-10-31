import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  outputFileTracingIncludes: {
    '/notes': ['./scratch/personal_notes_store.json'],
    '/quick-tasks': ['./scratch/quick_tasks_store.json'],
    '/content-management': ['./scratch/content_items_store.json', './scratch/content_types_store.json', './scratch/content_activities_store.json', './scratch/content_notifications_store.json', './scratch/content_files_store.json'],
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
