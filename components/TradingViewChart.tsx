'use client';

import { useEffect, useRef } from 'react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || chartRef.current) return;

    // Dynamically import to avoid SSR issues
    import('lightweight-charts').then(({ createChart, ColorType }) => {
      const chart = createChart(containerRef.current!, {
        layout: {
          background: { type: ColorType.Solid, color: '#1a1a1a' },
          textColor: '#d1d5db',
        },
        width: containerRef.current!.clientWidth,
        height: 400,
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        },
        grid: {
          vertLines: { color: '#2a2a2a' },
          horzLines: { color: '#2a2a2a' },
        },
      });

      // Try different methods until one works
      let series;
      try {
        series = (chart as any).addAreaSeries({
          topColor: 'rgba(250, 204, 21, 0.56)',
          bottomColor: 'rgba(250, 204, 21, 0.04)',
          lineColor: 'rgba(250, 204, 21, 1)',
          lineWidth: 2,
        });
      } catch (e) {
        series = (chart as any).addLineSeries({
          color: 'rgba(250, 204, 21, 1)',
          lineWidth: 2,
        });
      }

      chartRef.current = chart;
      seriesRef.current = series;

      const handleResize = () => {
        chart.applyOptions({ width: containerRef.current!.clientWidth });
      };

      window.addEventListener('resize', handleResize);
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !data.length) return;

    const lineData = data.map((candle) => ({
      time: candle.time,
      value: candle.close,
    }));

    seriesRef.current.setData(lineData);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '400px',
        backgroundColor: '#1a1a1a',
        borderRadius: '0.75rem',
      }}
    />
  );
}