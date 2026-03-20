interface SkeletonLoaderProps {
  type?: 'text' | 'title' | 'avatar' | 'card' | 'stat';
  count?: number;
  className?: string;
}

export default function SkeletonLoader({ 
  type = 'text', 
  count = 1,
  className = '' 
}: SkeletonLoaderProps) {
  const renderSkeleton = () => {
    switch (type) {
      case 'title':
        return <div className={`skeleton-title ${className}`} />;
      case 'avatar':
        return <div className={`skeleton-avatar ${className}`} />;
      case 'card':
        return <div className={`skeleton-card ${className}`} />;
      case 'stat':
        return (
          <div className="card p-6 flex items-center gap-4">
            <div className="skeleton w-14 h-14 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-20" />
              <div className="skeleton h-6 w-32" />
            </div>
          </div>
        );
      default:
        return <div className={`skeleton-text ${className}`} />;
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={count > 1 ? 'mb-3' : ''}>
          {renderSkeleton()}
        </div>
      ))}
    </>
  );
}
