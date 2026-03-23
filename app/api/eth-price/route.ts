import { NextResponse } from 'next/server';

// Cache em memória
let cachedPrice: { brl: number; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const FALLBACK_PRICE = 18000; // Preço de emergência

export async function GET() {
  try {
    // Verificar cache
    const now = Date.now();
    if (cachedPrice && (now - cachedPrice.timestamp) < CACHE_DURATION) {
      return NextResponse.json({
        brl: cachedPrice.brl,
        cached: true,
        timestamp: cachedPrice.timestamp
      });
    }

    // Buscar novo preço do CoinGecko
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=brl',
      { next: { revalidate: 300 } } // 5 minutos
    );

    if (!response.ok) {
      throw new Error('Falha ao buscar preço');
    }

    const data = await response.json();
    const ethBrl = data.ethereum?.brl;

    if (!ethBrl) {
      throw new Error('Preço BRL não encontrado');
    }

    // Atualizar cache
    cachedPrice = {
      brl: ethBrl,
      timestamp: now
    };

    return NextResponse.json({
      brl: ethBrl,
      cached: false,
      timestamp: now
    });
  } catch (error) {
    console.error('Erro ao buscar preço ETH/BRL:', error);

    // Fallback: retornar último preço cacheado ou preço de emergência
    if (cachedPrice) {
      return NextResponse.json({
        brl: cachedPrice.brl,
        cached: true,
        timestamp: cachedPrice.timestamp,
        error: 'Usando preço cacheado por falha na API'
      });
    }

    return NextResponse.json({
      brl: FALLBACK_PRICE,
      cached: false,
      timestamp: Date.now(),
      error: 'Usando preço de fallback'
    });
  }
}
