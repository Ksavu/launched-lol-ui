'use client';

import { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeriesPartialOptions, DeepPartial, ChartOptions } from 'lightweight-charts';

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
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const currentContainer = containerRef.current;

    if (!chartRef.current) {
      const chart = createChart(currentContainer, {
        layout: {
          background: { type: ColorType.Solid, color: '#1a1a1a' },
          textColor: '#d1d5db',
        },
        width: currentContainer.clientWidth,
        height: 400,
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        },
      } as DeepPartial<ChartOptions>);

      // This structure combines the series type and options directly into one object
      // as required by the 'SeriesDefinition' type in your lightweight-charts version.
      const candlestickSeries: ISeriesApi<'Candlestick'> = chart.addSeries({
        type: 'Candlestick',
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });

      chartRef.current = chart;
      candlestickSeriesRef.current = candlestickSeries;

      const handleResize = () => {
        if (chartRef.current && containerRef.current) {
          chartRef.current.applyOptions({
            width: currentContainer.clientWidth,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
          candlestickSeriesRef.current = null;
        }
      };
    }

    const chart = chartRef.current;
    const candlestickSeries = candlestickSeriesRef.current;

    if (chart && candlestickSeries && data.length) {
      const formattedData = data.map((candle) => ({
        time: candle.time as any,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }));

      candlestickSeries.setData(formattedData);
      chart.timeScale().fitContent();
    }
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
