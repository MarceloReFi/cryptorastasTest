"use client";

import { useEffect, useState } from "react";

const INFINITE_PAY_STORE_URL = "https://loja.infinitepay.io/cryptorastas/dlv7515-nft-cryptorastas";
const font = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const INK  = "#1a1500";
const Y    = "#FFD800";

const btnPrimary: React.CSSProperties = {
  width: "100%", padding: "0.7rem 1rem", borderRadius: "999px",
  fontFamily: font, fontWeight: 700, fontSize: "0.875rem",
  border: "none", background: INK, color: Y, cursor: "pointer", transition: "opacity 0.2s",
};
const btnSecondary: React.CSSProperties = {
  width: "100%", padding: "0.65rem 1rem", borderRadius: "999px",
  fontFamily: font, fontWeight: 500, fontSize: "0.875rem",
  border: "1.5px solid " + INK, background: "transparent", color: INK, cursor: "pointer", transition: "opacity 0.2s",
};
const MIN_PRICE_WEI = BigInt(
  Math.round(parseFloat(process.env.NEXT_PUBLIC_MIN_LISTING_ETH || "0.015") * 1e18).toString()
);

const paginationPill = (active: boolean): React.CSSProperties => ({
  padding: "0.5rem 1.5rem", borderRadius: "999px",
  fontFamily: font, fontWeight: active ? 700 : 400, fontSize: "0.875rem",
  background: active ? INK : "transparent", color: active ? Y : INK, border: "none",
  cursor: active ? "default" : "pointer",
  letterSpacing: active ? "0" : "0.1em",
  textTransform: active ? "none" : "uppercase" as const,
});

export function Marketplace({ itemsPerPage = 30 }: { itemsPerPage?: number }) {
  const [listings, setListings]       = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [cursors, setCursors]         = useState<(string | null)[]>([null]);
  const [pagesCache, setPagesCache]   = useState<Map<number, any[]>>(new Map());
  const [ethToBrl, setEthToBrl]       = useState<number>(18000);

  const fetchListings = async (pageNumber: number, cursor: string | null = null) => {
    try {
      setLoading(true); setError(null);
      if (pagesCache.has(pageNumber)) { setListings(pagesCache.get(pageNumber)!); setLoading(false); return; }
      const apiUrl = `/api/opensea-listings?limit=${itemsPerPage}${cursor ? `&cursor=${cursor}` : ""}`;
      const response = await fetch(apiUrl);
      if (!response.ok) { setListings([]); return; }
      const data = await response.json();
      if (!data.listings?.length) { setListings([]); return; }
      if (data.next && cursors.length === pageNumber + 1) setCursors(prev => [...prev, data.next]);
      const seen = new Set<string>();
      const unique = data.listings.filter((nft: any) => { if (seen.has(nft.tokenId)) return false; seen.add(nft.tokenId); return true; });
      const aboveFloor = unique.filter((nft: any) => {
        try { return BigInt(nft.price || "0") >= MIN_PRICE_WEI; } catch { return false; }
      });
      setPagesCache(prev => new Map(prev).set(pageNumber, aboveFloor));
      setListings(aboveFloor);
    } catch { setError("Erro ao buscar NFTs."); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchListings(currentPage, cursors[currentPage]); }, [currentPage]);

  useEffect(() => {
    async function fetchEthPrice() {
      try { const res = await fetch('/api/eth-price'); const d = await res.json(); if (d.brl) setEthToBrl(d.brl); } catch {}
    }
    fetchEthPrice();
    const t = setInterval(fetchEthPrice, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const refreshListings = () => { setPagesCache(new Map()); setCursors([null]); setCurrentPage(0); setListings([]); fetchListings(0, null); };

  const formatBrl = (ethPrice: string, decimals: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((parseInt(ethPrice) / Math.pow(10, decimals)) * ethToBrl);

  if (loading) return (
    <div style={{ textAlign: "center", padding: "3rem 0" }}>
      <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", border: "3px solid rgba(26,21,0,0.15)", borderTopColor: INK, animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: INK, opacity: 0.5, marginTop: "1rem", fontFamily: font, fontSize: "0.875rem" }}>Carregando...</p>
    </div>
  );

  if (listings.length === 0) return (
    <div style={{ textAlign: "center", padding: "3rem 0" }}>
      <p style={{ color: INK, opacity: 0.6, marginBottom: "1.5rem", fontFamily: font }}>{error ?? `Nenhum Cryptorasta disponível acima de ${(Number(MIN_PRICE_WEI) / 1e18).toFixed(2)} ETH no momento.`}</p>
      <button onClick={() => { setError(null); refreshListings(); }} style={{ ...btnSecondary, width: "auto", padding: "0.65rem 2rem" }}>Atualizar</button>
    </div>
  );

  const hasPrev = currentPage > 0;
  const hasNext = cursors[currentPage + 1] !== undefined;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1.5rem", marginBottom: "2.5rem" }}>
        <button onClick={() => setCurrentPage(p => p - 1)} disabled={!hasPrev} style={{ ...paginationPill(false), opacity: hasPrev ? 1 : 0.3, cursor: hasPrev ? "pointer" : "not-allowed" }}>Anterior</button>
        <span style={{ ...paginationPill(true), whiteSpace: "nowrap" }}>Página {currentPage + 1}</span>
        <button onClick={() => setCurrentPage(p => p + 1)} disabled={!hasNext} style={{ ...paginationPill(false), opacity: hasNext ? 1 : 0.3, cursor: hasNext ? "pointer" : "not-allowed" }}>Próxima</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
        {listings.map((nft) => (
          <div key={nft.tokenId}
            style={{ background: Y, borderRadius: "20px", overflow: "hidden", border: "1.5px solid rgba(26,21,0,0.12)", transition: "transform 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-4px)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <div style={{ width: "100%", aspectRatio: "1", background: "#111", overflow: "hidden", borderRadius: "14px 14px 0 0" }}>
              {nft.image
                ? <img src={nft.image} alt={nft.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#555", fontSize: "0.75rem" }}>Sem imagem</span></div>
              }
            </div>
            <div style={{ padding: "1rem 1.25rem 1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem" }}>
                <span style={{ fontFamily: font, fontWeight: 700, fontSize: "1.125rem", color: INK }}>#{nft.tokenId}</span>
                <span style={{ fontFamily: font, fontWeight: 700, fontSize: "1rem", color: INK }}>{formatBrl(nft.price, nft.decimals)}</span>
              </div>
              <a href={INFINITE_PAY_STORE_URL} target="_blank" rel="noopener noreferrer" style={{ ...btnPrimary, display: "block", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                Comprar
              </a>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
