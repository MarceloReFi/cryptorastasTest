"use client";

import { useEffect, useState } from "react";
import { Alchemy, Network } from "alchemy-sdk";

interface NFTGalleryProps {
  walletAddress: string;
}

interface NFTData {
  tokenId: string;
  title: string;
  image: string;
}

// CryptoRastas contract address on Ethereum mainnet
const CRYPTORASTAS_CONTRACT = "0x31d45de84fDE2fB36575085e05754a4932DD5170";

export function NFTGallery({ walletAddress }: NFTGalleryProps) {
  const [nfts, setNfts] = useState<NFTData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNFTs = async () => {
      try {
        setLoading(true);
        setError(null);

        const config = {
          apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
          network: Network.ETH_MAINNET,
        };

        const alchemy = new Alchemy(config);

        // Fetch NFTs for the specific CryptoRastas collection
        const response = await alchemy.nft.getNftsForOwner(walletAddress, {
          contractAddresses: [CRYPTORASTAS_CONTRACT],
        });

        const nftData: NFTData[] = response.ownedNfts.map((nft) => ({
          tokenId: nft.tokenId,
          title: nft.title || `CryptoRasta #${nft.tokenId}`,
          image:
            nft.media?.[0]?.gateway ||
            nft.media?.[0]?.thumbnail ||
            nft.media?.[0]?.raw ||
            "",
        }));

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
            Loading your Rastas...
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
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">🎨</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          No CryptoRastas Found
        </h3>
        <p className="text-gray-600">
          You don&apos;t have any CryptoRastas NFTs in this wallet yet.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Get yours on OpenSea or other NFT marketplaces!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {nfts.map((nft) => (
        <div
          key={nft.tokenId}
          className="bg-gradient-to-br from-green-100 to-yellow-100 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200"
        >
          {nft.image ? (
            <img
              src={nft.image}
              alt={nft.title}
              className="w-full h-64 object-cover"
            />
          ) : (
            <div className="w-full h-64 bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400">No image</span>
            </div>
          )}
          <div className="p-4">
            <h3 className="font-bold text-gray-800 truncate">{nft.title}</h3>
            <p className="text-sm text-gray-600">Token #{nft.tokenId}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
