'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Trade {
  timestamp: number;
  price: number;
}

interface PriceChartProps {
  trades: Trade[];
}

export function PriceChart({ trades }: PriceChartProps) {
  const [chartData, setChartData] = useState<Trade[]>([]);

  useEffect(() => {
    // Keep only last 50 trades
    setChartData(trades.slice(-50));
  }, [trades]);

  if (chartData.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-400">No trading data yet</p>
      </div>
    );
  }

  const formattedData = chartData.map((t) => ({
    time: new Date(t.timestamp).toLocaleTimeString(),
    price: t.price,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={formattedData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="time" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
        <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} tickFormatter={(v) => v.toFixed(6)} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1F2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            color: '#fff',
          }}
          formatter={(value: any) => [`${value.toFixed(6)} SOL`, 'Price']}
        />
        <Line type="monotone" dataKey="price" stroke="#FACC15" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
