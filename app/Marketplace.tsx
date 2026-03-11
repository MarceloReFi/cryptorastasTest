"use client";

import { useEffect, useState } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { prepareTransaction } from "thirdweb";
import { ethereum } from "thirdweb/chains";
import { createThirdwebClient } from "thirdweb";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

const SEAPORT_ADDRESS = "0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC";

export function Marketplace({ itemsPerPage = 20 }: { itemsPerPage?: number }) {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = itemsPerPage;
  const account = useActiveAccount();
  const { mutate: sendTransaction } = useSendTransaction();

  useEffect(() => {
    async function fetchListings() {
      try {
        let allListings: any[] = [];
        let nextCursor: string | null = null;
        let fetchCount = 0;
        const maxFetches = 1;

        do {
          const url: string = nextCursor
            ? `https://api.opensea.io/api/v2/listings/collection/cryptorastas-collection/all?limit=20&next=${nextCursor}`
            : "https://api.opensea.io/api/v2/listings/collection/cryptorastas-collection/all?limit=20";

          const response = await fetch(url, {
            headers: {
              "X-API-KEY": process.env.NEXT_PUBLIC_OPENSEA_API_KEY || "",
            },
          });

          const data = await response.json();

          if (data.listings) {
            allListings = [...allListings, ...data.listings];
          }

          nextCursor = data.next || null;
          fetchCount++;
        } while (nextCursor && fetchCount < maxFetches);

        if (allListings.length > 0) {
          const nftsWithDetails = await Promise.all(
            allListings.map(async (listing: any) => {
              const tokenId =
                listing.protocol_data?.parameters?.offer?.[0]?.identifierOrCriteria;
              const contractAddress =
                listing.protocol_data?.parameters?.offer?.[0]?.token;

              try {
                const nftResponse = await fetch(
                  `https://eth-mainnet.g.alchemy.com/nft/v3/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}/getNFTMetadata?contractAddress=${contractAddress}&tokenId=${tokenId}`,
                  {
                    headers: {
                      accept: "application/json",
                    },
                  }
                );

                const nftData = await nftResponse.json();

                return {
                  tokenId,
                  name: nftData.name || `CryptoRasta #${tokenId}`,
                  image: nftData.image?.cachedUrl || nftData.image?.originalUrl || "",
                  price: listing.price.current.value,
                  decimals: listing.price.current.decimals,
                  orderHash: listing.order_hash,
                  protocolAddress: listing.protocol_address,
                };
              } catch (error) {
                console.error(`Error fetching NFT ${tokenId}:`, error);
                return null;
              }
            })
          );

          setListings(nftsWithDetails.filter((nft) => nft !== null));
        }
      } catch (error) {
        console.error("Error fetching listings:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchListings();
  }, []);

  const handlePurchase = async (nft: any) => {
    if (!account) {
      alert("Please connect your wallet first!");
      return;
    }

    setPurchasing(nft.tokenId);

    try {
      const response = await fetch("/api/fulfill-listing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderHash: nft.orderHash,
          walletAddress: account.address,
        }),
      });

      const result = await response.json();

      if (result.fulfillment_data?.transaction?.input_data?.data) {
        const txData = result.fulfillment_data.transaction.input_data.data;

        const transaction = prepareTransaction({
          to: SEAPORT_ADDRESS,
          chain: ethereum,
          client: client,
          data: txData,
          value: BigInt(nft.price),
        });

        sendTransaction(transaction, {
          onSuccess: (result) => {
            alert(`Purchase successful!\n\nTransaction: ${result.transactionHash}`);
            setPurchasing(null);
          },
          onError: (error) => {
            console.error("Transaction failed:", error);
            alert(`Transaction failed: ${error.message}`);
            setPurchasing(null);
          },
        });
      }
    } catch (error: any) {
      console.error("Purchase error:", error);
      alert(`Purchase failed: ${error.message || "Unknown error"}`);
      setPurchasing(null);
    }
  };

  const handlePixPayment = async (nft: any) => {
    if (!account) {
      alert("Please connect your wallet first!");
      return;
    }

    setPurchasing(nft.tokenId);

    try {
      const priceInEth = parseInt(nft.price) / Math.pow(10, nft.decimals);

      const response = await fetch("/api/create-pix-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nftTokenId: nft.tokenId,
          nftPrice: priceInEth.toFixed(4),
          walletAddress: account.address,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      alert(
        `PIX Payment Created!\n\n` +
          `Amount: R$ ${data.amount_brl.toFixed(2)}\n\n` +
          `Scan the QR code or copy the PIX code.\n` +
          `Payment ID: ${data.payment_id}`
      );

      if (data.ticket_url) {
        window.open(data.ticket_url, "_blank");
      }

      setPurchasing(null);
    } catch (error: any) {
      console.error("PIX payment error:", error);
      alert(`Failed to create PIX payment: ${error.message}`);
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Carregando marketplace...</p>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Nenhuma CryptoRasta disponível no momento</p>
      </div>
    );
  }

  return (
    <>
      {/* Pagination */}
      <div className="flex justify-center gap-4 mb-4">
        <button
          onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
          disabled={currentPage === 0}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="py-2">
          Página {currentPage + 1} de{" "}
          {Math.ceil(listings.length / ITEMS_PER_PAGE)}
        </span>
        <button
          onClick={() => setCurrentPage((p) => p + 1)}
          disabled={(currentPage + 1) * ITEMS_PER_PAGE >= listings.length}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Próxima
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {listings
          .slice(
            currentPage * ITEMS_PER_PAGE,
            (currentPage + 1) * ITEMS_PER_PAGE
          )
          .map((nft) => (
            <div
              key={nft.tokenId}
              className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="w-full h-48 bg-gray-200">
                {nft.image && (
                  <img
                    src={nft.image}
                    alt={nft.name}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
              </div>
              <div className="p-3">
                <p className="font-bold text-sm truncate">{nft.name}</p>
                <p className="text-lg font-bold text-green-600 mt-2">
                  {(parseInt(nft.price) / Math.pow(10, nft.decimals)).toFixed(4)}{" "}
                  ETH
                </p>
                {account ? (
                  <div className="space-y-2">
                    <button
                      onClick={() => handlePurchase(nft)}
                      disabled={purchasing === nft.tokenId}
                      className={`w-full py-2 rounded-lg font-semibold ${
                        purchasing === nft.tokenId
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-blue-500 hover:bg-blue-600 text-white"
                      }`}
                    >
                      {purchasing === nft.tokenId
                        ? "Processando..."
                        : "Comprar com ETH"}
                    </button>
                    <button
                      onClick={() => handlePixPayment(nft)}
                      disabled={purchasing === nft.tokenId}
                      className={`w-full py-2 rounded-lg font-semibold ${
                        purchasing === nft.tokenId
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-rasta-yellow hover:bg-rasta-yellow-dark text-black font-bold"
                      }`}
                    >
                      Comprar com PIX
                    </button>
                  </div>
                ) : (
                  <button
                    disabled
                    className="w-full mt-3 py-2 rounded-lg font-semibold bg-gray-300 text-gray-600 cursor-not-allowed"
                  >
                    Conecte para Comprar
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>
    </>
  );
}
