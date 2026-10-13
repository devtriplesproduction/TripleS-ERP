import { Skeleton } from "@/components/ui/skeleton"

export default function MyTasksLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-48 rounded-md" />
            <Skeleton className="h-3.5 w-80 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>

      {/* Tabs Skeleton */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-t-md shrink-0" />
        ))}
      </div>

      {/* Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="border border-border/80 bg-card rounded-xl p-4 sm:p-4.5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="space-y-1.5 pt-0.5">
              <Skeleton className="h-5 w-40 rounded-md" />
              <Skeleton className="h-3 w-28 rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex items-center gap-1.5 pt-1">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-7 w-7 rounded-full" />
            </div>
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
