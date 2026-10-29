export function PremiumBadge({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1 bg-gradient-to-r from-[#7330c8] to-brand text-white px-2 py-1 rounded-md text-xs font-bold ${className}`}>
      <span>⭐</span>
      <span>PREMIUM</span>
    </div>
  );
}