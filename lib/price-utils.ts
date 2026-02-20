// Cache the price for 1 minute to avoid rate limiting
let cachedSolPrice: number | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute

export async function getSolPrice(): Promise<number> {
  const now = Date.now();
  
  // Return cached price if still valid
  if (cachedSolPrice && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedSolPrice;
  }
  
  try {
    // CoinGecko Free API (more reliable)
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    const price = data.solana?.usd;
    
    if (!price || typeof price !== 'number') {
      throw new Error('Invalid price data from CoinGecko');
    }
    
    cachedSolPrice = price;
    lastFetchTime = now;
    
    console.log('✅ SOL price updated from CoinGecko:', price);
    return price;
  } catch (error) {
    console.error('❌ Error fetching SOL price:', error);
    // Return cached price if available, otherwise fallback to $100
    return cachedSolPrice || 100;
  }
}

export function formatMarketCap(marketCap: number): string {
  if (marketCap >= 1_000_000) {
    return `$${(marketCap / 1_000_000).toFixed(2)}M`;
  } else if (marketCap >= 1_000) {
    return `$${(marketCap / 1_000).toFixed(2)}K`;
  } else {
    return `$${marketCap.toFixed(2)}`;
  }
}

export function formatPrice(price: number): string {
  if (price >= 1) {
    return `$${price.toFixed(2)}`;
  } else if (price >= 0.01) {
    return `$${price.toFixed(4)}`;
  } else {
    return `$${price.toFixed(8)}`;
  }
}