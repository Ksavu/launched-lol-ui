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
        background: { color: '#ffffff' },
        textColor: '#62596f',
      },
      grid: {
        vertLines: { color: '#f0e8fa' },
        horzLines: { color: '#f0e8fa' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#d0bce5',
      },
      rightPriceScale: {
        borderColor: '#d0bce5',
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: '#9945ff',
          style: 3,
        },
        horzLine: {
          width: 1,
          color: '#9945ff',
          style: 3,
        },
      },
    });

    chartRef.current = chart;

    // Create candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#14c783',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#14c783',
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

  return (
    <div className="relative w-full">
      <div ref={chartContainerRef} className="w-full rounded-lg overflow-hidden border border-line" style={{ minHeight: 400 }} />
      {data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white border border-line rounded-lg">
          <div className="text-center">
            <p className="text-muted text-lg mb-2">📈 No trading data yet</p>
            <p className="text-[#8a8291] text-sm">Chart will appear after first trade</p>
          </div>
        </div>
      )}
    </div>
  );
}
