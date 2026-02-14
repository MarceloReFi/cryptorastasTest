"use client";

import { useEffect, useState } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { prepareTransaction } from "thirdweb";
import { ethereum } from "thirdweb/chains";
import { createThirdwebClient, getContract } from "thirdweb";
import CardPaymentForm from "./components/CardPayment";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

const SEAPORT_ADDRESS = "0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC";

export function Marketplace() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [cardPaymentNft, setCardPaymentNft] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 20;
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
          const url = nextCursor
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
                listing.protocol_data?.parameters?.offer?.[0]
                  ?.identifierOrCriteria;

              const nftResponse = await fetch(
                `https://api.opensea.io/api/v2/chain/ethereum/contract/0x07cd221b2fe54094277a2f4e1c1bc6df14e63678/nfts/${tokenId}`,
                {
                  headers: {
                    "X-API-KEY": process.env.NEXT_PUBLIC_OPENSEA_API_KEY || "",
                  },
                }
              );

              const nftData = await nftResponse.json();

              return {
                tokenId,
                name: nftData.nft?.name || `CryptoRasta #${tokenId}`,
                image: nftData.nft?.image_url,
                price: listing.price?.current?.value,
                decimals: listing.price?.current?.decimals || 18,
                orderHash: listing.order_hash,
                protocolData: listing.protocol_data,
              };
            })
          );

          setListings(nftsWithDetails);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching listings:", error);
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
      const priceInEth = parseInt(nft.price) / Math.pow(10, nft.decimals);

      const confirmation = confirm(
        `Purchase ${nft.name} for ${priceInEth.toFixed(4)} ETH?\n\n` +
          `Note: You'll need ETH in your wallet + gas fees (~$10-20).`
      );

      if (!confirmation) {
        setPurchasing(null);
        return;
      }

      console.log("Building Seaport transaction...");
      console.log("Order data:", nft.protocolData);

      const seaportContract = getContract({
        client,
        chain: ethereum,
        address: SEAPORT_ADDRESS,
      });

      const params = nft.protocolData.parameters;

      const basicOrderParameters = {
        considerationToken: params.consideration[0].token,
        considerationIdentifier: params.consideration[0].identifierOrCriteria,
        considerationAmount: params.consideration[0].startAmount,
        offerer: params.offerer,
        zone: params.zone,
        offerToken: params.offer[0].token,
        offerIdentifier: params.offer[0].identifierOrCriteria,
        offerAmount: params.offer[0].startAmount,
        basicOrderType: 0,
        startTime: params.startTime,
        endTime: params.endTime,
        zoneHash: params.zoneHash,
        salt: params.salt,
        offererConduitKey: params.conduitKey,
        fulfillerConduitKey:
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        totalOriginalAdditionalRecipients: params.consideration.length - 1,
        additionalRecipients: params.consideration.slice(1).map((c: any) => ({
          amount: c.startAmount,
          recipient: c.recipient,
        })),
        signature: nft.protocolData.signature,
      };

      console.log("Sending transaction...");

      const transaction = prepareTransaction({
        to: SEAPORT_ADDRESS,
        chain: ethereum,
        client,
        value: BigInt(nft.price),
      });

      sendTransaction(transaction, {
        onSuccess: (result) => {
          console.log("Success!", result);
          alert(`NFT purchased! Transaction: ${result.transactionHash}`);
          setPurchasing(null);
        },
        onError: (error) => {
          console.error("Transaction failed:", error);
          alert(`Transaction failed: ${error.message}`);
          setPurchasing(null);
        },
      });
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

      console.log("Creating PIX payment...");

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

  const handleCardPayment = (nft: any) => {
    if (!account) {
      alert("Please connect your wallet first!");
      return;
    }
    setCardPaymentNft(nft);
  };

  const getAmountInBRL = (nft: any) => {
    const priceInEth = parseInt(nft.price) / Math.pow(10, nft.decimals);
    const ethToBrl = 15000;
    return Math.ceil(priceInEth * ethToBrl);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading marketplace...</p>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No listings available right now</p>
      </div>
    );
  }

  return (
    <>
      {/* Card Payment Modal */}
      {cardPaymentNft && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <h2 className="font-bold text-lg">Buy {cardPaymentNft.name}</h2>
                <p className="text-sm text-gray-600">
                  R$ {getAmountInBRL(cardPaymentNft).toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => setCardPaymentNft(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <CardPaymentForm
                amount={getAmountInBRL(cardPaymentNft)}
                onSuccess={(paymentId) => {
                  alert(
                    `Payment successful! ID: ${paymentId}\n\nYour NFT will be transferred shortly.`
                  );
                  setCardPaymentNft(null);
                }}
                onError={(error) => {
                  alert(`Payment failed: ${error}`);
                }}
              />
            </div>
          </div>
        </div>
      )}

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
                        ? "Processing..."
                        : "Buy with ETH"}
                    </button>
                    <button
                      onClick={() => handlePixPayment(nft)}
                      disabled={purchasing === nft.tokenId}
                      className={`w-full py-2 rounded-lg font-semibold ${
                        purchasing === nft.tokenId
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-yellow-500 hover:bg-yellow-600 text-white"
                      }`}
                    >
                      Buy with PIX
                    </button>
                    <button
                      onClick={() => handleCardPayment(nft)}
                      disabled={purchasing === nft.tokenId}
                      className={`w-full py-2 rounded-lg font-semibold ${
                        purchasing === nft.tokenId
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-purple-500 hover:bg-purple-600 text-white"
                      }`}
                    >
                      Buy with Credit Card
                    </button>
                  </div>
                ) : (
                  <button
                    disabled
                    className="w-full mt-3 py-2 rounded-lg font-semibold bg-gray-300 text-gray-600 cursor-not-allowed"
                  >
                    Connect Wallet to Buy
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>
    </>
  );
}