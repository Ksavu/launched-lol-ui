'use client';

import { useMemo } from 'react';

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface TradingViewChartProps {
  data: CandleData[];
}

export function TradingViewChart({ data }: TradingViewChartProps) {
  const chartData = useMemo(() => {
    if (!data.length) return null;

    const prices = data.map(d => d.close);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    const width = 100;
    const height = 100;
    const padding = 5;

    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
      const y = height - padding - ((d.close - minPrice) / priceRange) * (height - 2 * padding);
      return `${x},${y}`;
    }).join(' ');

    return { points, minPrice, maxPrice };
  }, [data]);

  if (!chartData) {
    return (
      <div className="w-full h-[400px] bg-gray-800 rounded-xl flex items-center justify-center">
        <p className="text-gray-400">No chart data available</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] bg-gray-900 rounded-xl p-4">
      <div className="flex justify-between mb-2 text-sm">
        <span className="text-gray-400">Price Chart</span>
        <span className="text-yellow-400 font-bold">
          ${chartData.maxPrice.toFixed(6)}
        </span>
      </div>
      
      <svg 
        viewBox="0 0 100 100" 
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        {/* Grid lines */}
        <line x1="0" y1="25" x2="100" y2="25" stroke="#2a2a2a" strokeWidth="0.2" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="#2a2a2a" strokeWidth="0.2" />
        <line x1="0" y1="75" x2="100" y2="75" stroke="#2a2a2a" strokeWidth="0.2" />
        
        {/* Area gradient */}
        <defs>
          <linearGradient id="priceGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(250, 204, 21, 0.4)" />
            <stop offset="100%" stopColor="rgba(250, 204, 21, 0)" />
          </linearGradient>
        </defs>
        
        {/* Area under line */}
        <polygon
          points={`5,95 ${chartData.points} 95,95`}
          fill="url(#priceGradient)"
        />
        
        {/* Price line */}
        <polyline
          points={chartData.points}
          fill="none"
          stroke="#FACC15"
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      
      <div className="flex justify-between mt-2 text-xs text-gray-400">
        <span>${chartData.minPrice.toFixed(6)}</span>
        <span>{data.length} data points</span>
      </div>
    </div>
  );
}