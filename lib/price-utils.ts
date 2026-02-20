// Cache the price for 1 minute to avoid rate limiting
let cachedSolPrice: number | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute

export async function getSolPrice(): Promise<number> {
  const now = Date.now();
  
  if (cachedSolPrice && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedSolPrice;
  }
  
  // Try Jupiter first
  try {
    const jupiterResponse = await fetch(
      'https://price.jup.ag/v6/price?ids=So11111111111111111111111111111111111111112',
      { 
        next: { revalidate: 60 },
        headers: { 'Accept': 'application/json' }
      }
    );
    
    if (jupiterResponse.ok) {
      const data = await jupiterResponse.json();
      const price = data.data?.So11111111111111111111111111111111111111112?.price;
      
      if (price && typeof price === 'number') {
        cachedSolPrice = price;
        lastFetchTime = now;
        console.log('✅ SOL price from Jupiter:', price);
        return price;
      }
    }
  } catch (error) {
    console.log('⚠️ Jupiter failed, trying CoinGecko...');
  }
  
  // Fallback to CoinGecko
  try {
    const coinGeckoResponse = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
    );
    
    if (coinGeckoResponse.ok) {
      const data = await coinGeckoResponse.json();
      const price = data.solana?.usd;
      
      if (price && typeof price === 'number') {
        cachedSolPrice = price;
        lastFetchTime = now;
        console.log('✅ SOL price from CoinGecko:', price);
        return price;
      }
    }
  } catch (error) {
    console.error('❌ Both APIs failed:', error);
  }
  
  // Return cached or fallback
  return cachedSolPrice || 100;
}