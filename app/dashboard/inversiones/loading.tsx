export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="h-10 bg-neutral-200 rounded-lg w-1/3 mb-8 animate-pulse" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-neutral-200 rounded-lg h-32 animate-pulse" />
        ))}
      </div>

      <div className="bg-neutral-200 rounded-lg h-96 animate-pulse" />
    </div>
  );
}
