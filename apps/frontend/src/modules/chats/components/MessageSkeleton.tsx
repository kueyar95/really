export function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <div className={`max-w-[70%] rounded-lg p-3 shadow-sm ${i % 2 === 0 ? 'bg-white' : 'bg-[#d9fdd3]/50'}`}>
            <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-24"></div>
            <div className="h-2 bg-gray-200 rounded w-16 mt-2"></div>
          </div>
        </div>
      ))}
    </div>
  );
}