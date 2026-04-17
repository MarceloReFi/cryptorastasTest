"use client";
import { useEffect, useState } from "react";

interface NFTGalleryProps { walletAddress: string; itemsPerPage?: number; }
interface NFTData { tokenId: string; title: string; image: string; }

const font = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const INK  = "#1a1500";
const Y    = "#FFD800";

const paginationPill = (active: boolean): React.CSSProperties => ({
  padding: "0.5rem 1.5rem", borderRadius: "999px",
  fontFamily: font, fontWeight: active ? 700 : 400, fontSize: "0.875rem",
  background: active ? INK : "transparent", color: active ? Y : INK, border: "none",
  cursor: active ? "default" : "pointer",
  letterSpacing: active ? "0" : "0.1em",
  textTransform: active ? "none" : "uppercase" as const,
});

export function NFTGallery({ walletAddress, itemsPerPage = 20 }: NFTGalleryProps) {
  const [nfts, setNfts]               = useState<NFTData[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const fetchNFTs = async () => {
      try { setLoading(true); setError(null); const res = await fetch(`/api/nft-owner?wallet=${walletAddress}`); setNfts(await res.json()); }
      catch { setError("Erro ao carregar NFTs."); }
      finally { setLoading(false); }
    };
    if (walletAddress) fetchNFTs();
  }, [walletAddress]);

  if (loading) return (
    <div style={{ textAlign: "center", padding: "2rem 0" }}>
      <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", border: "3px solid rgba(26,21,0,0.15)", borderTopColor: INK, animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: INK, opacity: 0.5, marginTop: "0.75rem", fontFamily: font, fontSize: "0.875rem" }}>Carregando...</p>
    </div>
  );

  if (error) return <p style={{ fontFamily: font, color: INK, opacity: 0.6, textAlign: "center", padding: "2rem 0" }}>{error}</p>;

  if (nfts.length === 0) return (
    <div style={{ textAlign: "center", padding: "2rem 0" }}>
      <p style={{ fontFamily: font, color: INK, opacity: 0.5, fontSize: "0.9375rem" }}>Você ainda não tem Cryptorastas.</p>
  
    </div>
  );

  const totalPages = Math.ceil(nfts.length / itemsPerPage);
  const paginated  = nfts.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  return (
    <>
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1.5rem", marginBottom: "2rem" }}>
          <button disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}
            style={{ ...paginationPill(false), opacity: currentPage === 0 ? 0.3 : 1, cursor: currentPage === 0 ? "not-allowed" : "pointer" }}>Anterior</button>
          <span style={paginationPill(true)}>Página {currentPage + 1} de {totalPages}</span>
          <button disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)}
            style={{ ...paginationPill(false), opacity: currentPage >= totalPages - 1 ? 0.3 : 1, cursor: currentPage >= totalPages - 1 ? "not-allowed" : "pointer" }}>Próxima</button>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1.25rem" }}>
        {paginated.map((nft) => (
          <div key={nft.tokenId}
            style={{ background: Y, borderRadius: "20px", overflow: "hidden", border: "1.5px solid rgba(26,21,0,0.12)", transition: "transform 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-4px)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <div style={{ width: "100%", aspectRatio: "1", background: "#111", overflow: "hidden", borderRadius: "14px 14px 0 0" }}>
              {nft.image
                ? <img src={nft.image} alt={nft.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#555", fontSize: "0.75rem" }}>Sem imagem</span></div>
              }
            </div>
            <div style={{ padding: "0.75rem 1rem" }}>
              <span style={{ fontFamily: font, fontWeight: 700, fontSize: "1rem", color: INK }}>#{nft.tokenId}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
