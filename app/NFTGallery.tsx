"use client";
import { useEffect, useState } from "react";

interface NFTGalleryProps {
  walletAddress: string;
  itemsPerPage?: number;
}

interface NFTData {
  tokenId: string;
  title: string;
  image: string;
}

const btnStyle = (disabled: boolean) => ({
  padding: "0.5rem 1.5rem",
  borderRadius: "8px",
  fontWeight: 600,
  fontSize: "0.875rem",
  border: "1px solid var(--outline-variant)",
  background: disabled ? "var(--surface-mid)" : "var(--surface-high)",
  color: disabled ? "var(--on-surface-variant)" : "var(--on-background)",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.5 : 1,
  transition: "all 0.2s",
});

export function NFTGallery({ walletAddress, itemsPerPage = 20 }: NFTGalleryProps) {
  const [nfts, setNfts] = useState<NFTData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const fetchNFTs = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/nft-owner?wallet=${walletAddress}`);
        const nftData: NFTData[] = await response.json();
        setNfts(nftData);
      } catch {
        setError("Erro ao carregar NFTs. Tente novamente.");
      } finally {
        setLoading(false);
      }
    };
    if (walletAddress) fetchNFTs();
  }, [walletAddress]);

  if (loading) return (
    <div style={{ textAlign: "center", padding: "3rem 0" }}>
      <div style={{
        width: "2.5rem", height: "2.5rem", borderRadius: "50%",
        border: "3px solid var(--surface-high)",
        borderTopColor: "var(--gold)",
        animation: "spin 0.8s linear infinite",
        margin: "0 auto",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: "var(--on-surface-variant)", marginTop: "1rem" }}>Carregando seus Cryptorastas...</p>
    </div>
  );

  if (error) return (
    <div style={{ background: "var(--red-container)", borderRadius: "8px", padding: "1.5rem", textAlign: "center" }}>
      <p style={{ color: "var(--red)" }}>{error}</p>
    </div>
  );

  if (nfts.length === 0) return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <p style={{ color: "var(--on-surface-variant)" }}>Você ainda não tem Cryptorastas.</p>
    </div>
  );

  const totalPages = Math.ceil(nfts.length / itemsPerPage);
  const paginatedNfts = nfts.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  return (
    <>
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
          <button style={btnStyle(currentPage === 0)} disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>Anterior</button>
          <span style={{ color: "var(--on-surface-variant)", fontSize: "0.875rem" }}>Página {currentPage + 1} de {totalPages}</span>
          <button style={btnStyle(currentPage >= totalPages - 1)} disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)}>Próxima</button>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "1rem" }}>
        {paginatedNfts.map((nft) => (
          <div key={nft.tokenId} style={{
            background: "var(--surface-high)",
            borderRadius: "12px",
            overflow: "hidden",
            transition: "transform 0.2s",
          }}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.03)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            {nft.image
              ? <img src={nft.image} alt={nft.title} style={{ width: "100%", display: "block" }} />
              : <div style={{ width: "100%", aspectRatio: "1", background: "var(--surface-mid)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "var(--on-surface-variant)", fontSize: "0.75rem" }}>Sem imagem</span>
                </div>
            }
            <div style={{ padding: "0.5rem", textAlign: "center" }}>
              <p style={{ fontSize: "0.8125rem", color: "var(--on-surface-variant)" }}>#{nft.tokenId}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
