export function PremiumBadge({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-2 py-1 rounded-md text-xs font-bold ${className}`}>
      <span>⭐</span>
      <span>PREMIUM</span>
    </div>
  );
}