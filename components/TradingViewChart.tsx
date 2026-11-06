'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';

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
  /** token supply; with solPrice converts price (SOL/token) into market cap in USD */
  supply?: number;
  solPrice?: number;
}

const UP = '#22c55e';
const DOWN = '#ef4444';

function fmtUsd(n: number) {
  const a = Math.abs(n);
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

export function TradingViewChart({ data, supply = 1_000_000_000, solPrice = 100 }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleRef = useRef<any>(null);
  const volumeRef = useRef<any>(null);
  const [legend, setLegend] = useState<{ o: number; h: number; l: number; c: number; v: number } | null>(null);

  const mult = supply * solPrice;

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0f0f14' },
        textColor: '#8b8b99',
        fontSize: 12,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      width: containerRef.current.clientWidth,
      height: 440,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: 'rgba(255,255,255,0.08)',
        rightOffset: 4,
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        scaleMargins: { top: 0.08, bottom: 0.25 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { width: 1, color: 'rgba(255,255,255,0.25)', style: 3, labelBackgroundColor: '#2a2a35' },
        horzLine: { width: 1, color: 'rgba(255,255,255,0.25)', style: 3, labelBackgroundColor: '#2a2a35' },
      },
      localization: { priceFormatter: (p: number) => fmtUsd(p) },
    });
    chartRef.current = chart;

    const candles = chart.addCandlestickSeries({
      upColor: UP,
      downColor: DOWN,
      borderUpColor: UP,
      borderDownColor: DOWN,
      wickUpColor: UP,
      wickDownColor: DOWN,
      priceLineColor: '#8b8b99',
      priceFormat: { type: 'custom', formatter: (p: number) => fmtUsd(p), minMove: 0.01 },
    });
    candleRef.current = candles;

    const volume = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    volumeRef.current = volume;

    chart.subscribeCrosshairMove((param: any) => {
      const c = param?.seriesData?.get(candles);
      const v = param?.seriesData?.get(volume);
      if (c) setLegend({ o: c.open, h: c.high, l: c.low, c: c.close, v: v?.value ?? 0 });
      else setLegend(null);
    });

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candleRef.current || data.length === 0) return;
    candleRef.current.setData(
      data.map((d) => ({
        time: d.time,
        open: d.open * mult,
        high: d.high * mult,
        low: d.low * mult,
        close: d.close * mult,
      }))
    );
    volumeRef.current?.setData(
      data.map((d) => ({
        time: d.time,
        value: d.volume ?? 0,
        color: d.close >= d.open ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.45)',
      }))
    );
    chartRef.current?.timeScale().fitContent();
  }, [data, mult]);

  const last = data.length ? data[data.length - 1] : null;
  const shown = legend ?? (last ? { o: last.open * mult, h: last.high * mult, l: last.low * mult, c: last.close * mult, v: last.volume ?? 0 } : null);
  const change = shown && shown.o ? ((shown.c - shown.o) / shown.o) * 100 : 0;
  const color = change >= 0 ? UP : DOWN;

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-white/10 bg-[#0f0f14]">
      {shown && (
        <div className="pointer-events-none absolute left-3 top-2 z-10 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-medium text-[#8b8b99]">
          <span>MC</span>
          <span>O <b style={{ color }}>{fmtUsd(shown.o)}</b></span>
          <span>H <b style={{ color }}>{fmtUsd(shown.h)}</b></span>
          <span>L <b style={{ color }}>{fmtUsd(shown.l)}</b></span>
          <span>C <b style={{ color }}>{fmtUsd(shown.c)}</b></span>
          <b style={{ color }}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</b>
          <span>Vol <b className="text-[#c9c9d4]">{shown.v.toFixed(2)} SOL</b></span>
        </div>
      )}
      <div ref={containerRef} className="w-full" style={{ minHeight: 440 }} />
      {data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0f0f14]">
          <div className="text-center">
            <p className="mb-2 text-lg text-[#c9c9d4]">📈 No trading data yet</p>
            <p className="text-sm text-[#8b8b99]">Chart will appear after first trade</p>
          </div>
        </div>
      )}
    </div>
  );
}
