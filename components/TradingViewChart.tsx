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

declare global {
  interface Window {
    TradingView: any;
  }
}

export function TradingViewChart({ data }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || !data.length) return;

    const initChart = async () => {
      try {
        // Load the library from CDN as a fallback
        if (!window.TradingView) {
          // Create a promise that resolves when the library is loaded
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/lightweight-charts@4/dist/lightweight-charts.standalone.production.js';
          script.async = true;
          script.onload = () => {
            createChartInstance();
          };
          script.onerror = () => {
            console.error('Failed to load TradingView from CDN');
            // Fallback to local import
            loadLocalChart();
          };
          document.head.appendChild(script);
        } else {
          createChartInstance();
        }
      } catch (error) {
        console.error('Error loading chart:', error);
        loadLocalChart();
      }
    };

    const createChartInstance = () => {
      if (!containerRef.current) return;

      try {
        // Get the library from window or import
        const lib = (window as any).LightweightCharts || require('lightweight-charts');
        const { createChart, ColorType } = lib;

        // Clear container
        containerRef.current.innerHTML = '';

        // Create chart
        const chart = createChart(containerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: '#1a1a1a' },
            textColor: '#d1d5db',
          },
          width: containerRef.current.clientWidth,
          height: 400,
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
          },
        });

        // Add candlestick series
        const candlestickSeries = chart.addCandlestickSeries({
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderUpColor: '#22c55e',
          borderDownColor: '#ef4444',
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444',
        });

        // Format data
        const formattedData = data.map((candle) => ({
          time: candle.time as any,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        }));

        // Set data
        candlestickSeries.setData(formattedData);
        chart.timeScale().fitContent();

        chartRef.current = chart;

        // Handle resize
        const handleResize = () => {
          if (containerRef.current && chartRef.current) {
            chartRef.current.applyOptions({
              width: containerRef.current.clientWidth,
            });
          }
        };

        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
        };
      } catch (error) {
        console.error('Error creating chart instance:', error);
      }
    };

    const loadLocalChart = async () => {
      try {
        const { createChart, ColorType } = await import('lightweight-charts');

        if (!containerRef.current) return;

        containerRef.current.innerHTML = '';

        const chart = createChart(containerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: '#1a1a1a' },
            textColor: '#d1d5db',
          },
          width: containerRef.current.clientWidth,
          height: 400,
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
          },
        });

        const candlestickSeries = chart.addCandlestickSeries({
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderUpColor: '#22c55e',
          borderDownColor: '#ef4444',
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444',
        });

        const formattedData = data.map((candle) => ({
          time: candle.time as any,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        }));

        candlestickSeries.setData(formattedData);
        chart.timeScale().fitContent();

        chartRef.current = chart;

        const handleResize = () => {
          if (containerRef.current && chartRef.current) {
            chartRef.current.applyOptions({
              width: containerRef.current.clientWidth,
            });
          }
        };

        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
        };
      } catch (error) {
        console.error('Error loading local chart:', error);
      }
    };

    initChart();

    return () => {
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch (e) {
          console.error('Error removing chart:', e);
        }
      }
    };
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
