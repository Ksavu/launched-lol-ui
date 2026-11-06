interface Trade {
  type: 'buy' | 'sell';
  tokens: number;
  sol: number;
  price: number;
  timestamp: number;
  signature: string;
  user: string;
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function buildCandles(
  trades: Trade[],
  intervalSeconds: number = 60 // 1 minute default
): CandleData[] {
  if (trades.length === 0) return [];
  
  // Group trades by time interval
  const grouped = new Map<number, Trade[]>();
  
  trades.forEach(trade => {
    const candleTime = Math.floor(trade.timestamp / intervalSeconds) * intervalSeconds;
    
    if (!grouped.has(candleTime)) {
      grouped.set(candleTime, []);
    }
    grouped.get(candleTime)!.push(trade);
  });
  
  // Build candles from grouped trades
  const candles: CandleData[] = [];
  
  grouped.forEach((trades, time) => {
    const prices = trades.map(t => t.price);
    const volume = trades.reduce((sum, t) => sum + t.sol, 0);
    
    candles.push({
      time,
      open: prices[0],
      high: Math.max(...prices),
      low: Math.min(...prices),
      close: prices[prices.length - 1],
      volume,
    });
  });
  
  // Sort by time
  candles.sort((a, b) => a.time - b.time);

  // Make candles continuous like exchange charts: each candle opens at the previous close
  // (the first one opens at the curve's starting price), so wicks and bodies show real moves.
  const INITIAL_PRICE = 30 / 1040; // SOL per million tokens at curve start
  candles.forEach((c, i) => {
    const open = i === 0 ? INITIAL_PRICE : candles[i - 1].close;
    c.open = open;
    c.high = Math.max(c.high, open);
    c.low = Math.min(c.low, open);
  });
  return candles;
}

// Fill gaps with previous close price
export function fillCandleGaps(
  candles: CandleData[],
  intervalSeconds: number = 60
): CandleData[] {
  if (candles.length === 0) return [];
  
  const filled: CandleData[] = [];
  
  for (let i = 0; i < candles.length - 1; i++) {
    const current = candles[i];
    const next = candles[i + 1];
    
    filled.push(current);
    
    // Fill gaps between candles
    const gap = (next.time - current.time) / intervalSeconds;
    
    for (let j = 1; j < Math.min(gap, 300); j++) {
      filled.push({
        time: current.time + (j * intervalSeconds),
        open: current.close,
        high: current.close,
        low: current.close,
        close: current.close,
        volume: 0,
      });
    }
  }
  
  // Add last candle
  filled.push(candles[candles.length - 1]);
  
  return filled;
}