import { Skeleton } from "@/components/ui/skeleton"

export function LayoutSkeleton() {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar Skeleton */}
      <div className="w-64 bg-white border-r flex flex-col">
        {/* Logo area */}
        <div className="h-16 px-6 border-b flex items-center">
          <Skeleton className="h-6 w-24" />
        </div>

        {/* Menu items */}
        <div className="p-4 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="h-16 border-b bg-white px-8 flex items-center justify-between">
          <Skeleton className="h-8 w-[200px]" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-3 w-[140px]" />
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 p-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-[300px]" />
            <Skeleton className="h-[200px] w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}