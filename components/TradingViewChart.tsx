'use client';

import { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface TradingViewChartProps {
  data: CandleData[];
}

export function TradingViewChart({ data }: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#000000' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#374151',
      },
      rightPriceScale: {
        borderColor: '#374151',
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: '#6b7280',
          style: 3,
        },
        horzLine: {
          width: 1,
          color: '#6b7280',
          style: 3,
        },
      },
    });

    chartRef.current = chart;

    // Create candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    candlestickSeriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, []);

  // Update data when it changes
  useEffect(() => {
    if (candlestickSeriesRef.current && data.length > 0) {
      candlestickSeriesRef.current.setData(data);
      
      // Fit content
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    }
  }, [data]);

  // Show message if no data
  if (data.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-black border border-gray-800 rounded-lg">
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-2">📈 No trading data yet</p>
          <p className="text-gray-500 text-sm">Chart will appear after first trade</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={chartContainerRef} className="w-full rounded-lg overflow-hidden border border-gray-800" />
  );
}