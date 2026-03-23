"use client";

import { useEffect, useState } from "react";
import { Alchemy, Network } from "alchemy-sdk";
import { NFTCard } from "./components/NFTCard";

interface NFTGalleryProps {
  walletAddress: string;
  itemsPerPage?: number;
}

interface NFTData {
  tokenId: string;
  title: string;
  image: string;
}

const CRYPTORASTAS_CONTRACT = "0x07cd221b2fe54094277a2f4e1c1bc6df14e63678";

export function NFTGallery({ walletAddress, itemsPerPage = 20 }: NFTGalleryProps) {
  const [nfts, setNfts] = useState<NFTData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = itemsPerPage;

  useEffect(() => {
    const fetchNFTs = async () => {
      try {
        setLoading(true);
        setError(null);

        const alchemy = new Alchemy({
          apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
          network: Network.ETH_MAINNET,
        });

        const response = await alchemy.nft.getNftsForOwner(walletAddress, {
          contractAddresses: [CRYPTORASTAS_CONTRACT],
        });

        const nftData: NFTData[] = response.ownedNfts.map((nft) => ({
          tokenId: nft.tokenId,
          title: nft.name || `CryptoRasta #${nft.tokenId}`,
          image:
            nft.image?.cachedUrl ||
            nft.image?.thumbnailUrl ||
            nft.image?.originalUrl ||
            "",
        }));

        setNfts(nftData);
      } catch (err) {
        console.error("Error fetching NFTs:", err);
        setError("Falha ao carregar NFTs. Tente novamente.");
      } finally {
        setLoading(false);
      }
    };

    if (walletAddress) fetchNFTs();
  }, [walletAddress]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div
          className="w-10 h-10 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: "var(--cr-green)", borderRightColor: "var(--cr-yellow)" }}
        />
        <p className="text-sm" style={{ color: "var(--cr-text-secondary)" }}>
          Carregando seus Cryptorastas...
        </p>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div
        className="rounded-[var(--cr-radius)] p-6 text-center"
        style={{ background: "rgba(237, 28, 36, 0.08)", border: "1px solid rgba(237, 28, 36, 0.2)" }}
      >
        <p style={{ color: "#f87171" }}>{error}</p>
      </div>
    );
  }

  /* ── Empty ── */
  if (nfts.length === 0) {
    return (
      <div className="py-8 text-center">
        <p style={{ color: "var(--cr-text-secondary)" }}>Você ainda não tem Cryptorastas.</p>
        <p className="text-sm mt-1" style={{ color: "var(--cr-text-muted)" }}>
          Adquira a sua abaixo!
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(nfts.length / ITEMS_PER_PAGE);
  const paginatedNfts = nfts.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  return (
    <>
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mb-6">
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="px-5 py-2 rounded-[12px] font-bold text-white text-sm transition-all duration-300
                       hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{ background: "var(--cr-green)", boxShadow: "0 4px 14px var(--cr-green-glow)" }}
          >
            Anterior
          </button>
          <span className="text-sm font-semibold" style={{ color: "var(--cr-text-secondary)" }}>
            Página {currentPage + 1} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={currentPage >= totalPages - 1}
            className="px-5 py-2 rounded-[12px] font-bold text-white text-sm transition-all duration-300
                       hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{ background: "var(--cr-green)", boxShadow: "0 4px 14px var(--cr-green-glow)" }}
          >
            Próxima
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {paginatedNfts.map((nft) => (
          <NFTCard key={nft.tokenId} tokenId={nft.tokenId} name={nft.title} image={nft.image} />
        ))}
      </div>
    </>
  );
}
