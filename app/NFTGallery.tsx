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

        const response = await fetch(`/api/nft-owner?wallet=${walletAddress}`);
        const nftData: NFTData[] = await response.json();

        setNfts(nftData);
      } catch (err) {
        console.error("Error fetching NFTs:", err);
        setError("Failed to fetch NFTs. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (walletAddress) {
      fetchNFTs();
    }
  }, [walletAddress]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-green-200 rounded-full animate-spin border-t-green-600"></div>
          <p className="text-gray-600 mt-4 text-center">
            Carregando seus Cryptorastas...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="rounded-lg p-8 text-center">
        <p className="text-gray-600">
          Você ainda não tem Cryptorastas.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Adquira a sua abaixo!
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(nfts.length / ITEMS_PER_PAGE);
  const paginatedNfts = nfts.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  return (
    <>
      {totalPages > 1 && (
        <div className="flex justify-center gap-4 mb-4">
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-rasta-green text-white rounded-lg font-bold hover:bg-rasta-green-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Anterior
          </button>
          <span className="py-2 text-gray-800 font-semibold text-sm sm:text-base">Página {currentPage + 1} de {totalPages}</span>
          <button
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={currentPage >= totalPages - 1}
            className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-rasta-green text-white rounded-lg font-bold hover:bg-rasta-green-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Próxima
          </button>
        </div>
      )}
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {paginatedNfts.map((nft) => (
        <div
          key={nft.tokenId}
          className="rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
        >
          {nft.image ? (
            <img
              src={nft.image}
              alt={nft.title}
              className="w-full h-auto block"
            />
          ) : (
            <div className="w-full h-56 flex items-center justify-center bg-gray-200 rounded-lg">
              <span className="text-gray-400 text-sm">Sem imagem</span>
            </div>
          )}
          <div className="p-2 text-center">
            <p className="text-sm text-gray-700 font-medium">#{nft.tokenId}</p>
          </div>
        </div>
      ))}
    </div>
    </>
  );
}
