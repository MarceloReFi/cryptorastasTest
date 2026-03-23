"use client";

import { useEffect, useState } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { prepareTransaction, createThirdwebClient } from "thirdweb";
import { ethereum } from "thirdweb/chains";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

const SEAPORT_1_6_ADDRESS = "0x0000000000000068F116a894984e2DB1123eB395";

export function Marketplace({ itemsPerPage = 20 }: { itemsPerPage?: number }) {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [showPixSoon, setShowPixSoon] = useState(false);
  const ITEMS_PER_PAGE = itemsPerPage;
  const account = useActiveAccount();
  const { mutate: sendTransaction } = useSendTransaction();

  useEffect(() => {
    async function fetchListings() {
      try {
        setError(null);

        const url =
          "https://api.opensea.io/api/v2/listings/collection/cryptorastas-collection/all" +
          "?limit=50";

        console.log("🔍 Buscando listings ativos...");

        const response = await fetch(url, {
          headers: {
            "X-API-KEY": process.env.NEXT_PUBLIC_OPENSEA_API_KEY || "",
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          console.error("❌ Erro na API OpenSea:", response.status, response.statusText);
          const errorText = await response.text();
          console.error("Detalhes do erro:", errorText);
          setListings([]);
          return;
        }

        const data = await response.json();
        console.log("📊 Listings response:", data);

        if (!data.listings || data.listings.length === 0) {
          console.warn("⚠️ Nenhum Cryptorasta disponível");
          setListings([]);
          return;
        }

        const allListings = data.listings;
        console.log(`📦 Total de ${allListings.length} listings ativos recebidos`);

        const nftsWithDetails = await Promise.all(
          allListings.map(async (listing: any) => {
            try {
              const tokenId =
                listing.protocol_data?.parameters?.offer?.[0]?.identifierOrCriteria;

              const contractAddress =
                listing.protocol_data?.parameters?.offer?.[0]?.token ||
                "0x07cd221b2fe54094277a2f4e1c1bc6df14e63678";

              if (!tokenId) {
                console.warn("⚠️ Listing sem token_id:", listing.order_hash);
                return null;
              }

              const nftResponse = await fetch(
                `https://eth-mainnet.g.alchemy.com/nft/v3/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}/getNFTMetadata?contractAddress=${contractAddress}&tokenId=${tokenId}`,
                { headers: { accept: "application/json" } }
              );

              const nftData = await nftResponse.json();

              return {
                tokenId,
                name: nftData.name || `Cryptorasta #${tokenId}`,
                image: nftData.image?.cachedUrl || nftData.image?.originalUrl || "",
                price: listing.price?.current?.value || "0",
                decimals: listing.price?.current?.decimals || 18,
                orderHash: listing.order_hash,
                protocolAddress:
                  listing.protocol_address ||
                  SEAPORT_1_6_ADDRESS,
                fullOrder: listing,
              };
            } catch (error) {
              console.error("❌ Erro processando listing:", error);
              return null;
            }
          })
        );

        const validListings = nftsWithDetails.filter((nft) => nft !== null);
        console.log(`✅ ${validListings.length} NFTs válidos carregados`);
        setListings(validListings);
      } catch (error) {
        console.error("Error fetching listings:", error);
        setError("Erro ao buscar NFTs. Tente novamente.");
      } finally {
        setLoading(false);
      }
    }

    fetchListings();
  }, [lastRefresh]);

  const refreshListings = () => {
    setLastRefresh(Date.now());
    setCurrentPage(0);
  };

  const removeInvalidListing = (tokenId: string) => {
    setListings((prev) => prev.filter((nft) => nft.tokenId !== tokenId));
  };

  const handlePurchase = async (nft: any) => {
    if (!account) {
      alert("Por favor, conecte sua carteira primeiro!");
      return;
    }

    setPurchasing(nft.tokenId);

    try {
      console.log("🔄 Iniciando compra...");
      console.log("NFT:", nft.tokenId);
      console.log("Order Hash:", nft.orderHash);

      const response = await fetch("/api/fulfill-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderHash: nft.orderHash,
          walletAddress: account.address,
          protocolAddress: nft.protocolAddress,
        }),
      });

      const result = await response.json();
      console.log("📦 Resposta da API:", result);

      if (result.error) {
        if (result.error.includes("not found")) {
          removeInvalidListing(nft.tokenId);
          alert("❌ Este NFT já foi vendido. A lista será atualizada.");
          setPurchasing(null);
          return;
        }
        throw new Error(result.error);
      }

      if (!result.fulfillment_data?.transaction) {
        console.error("❌ Estrutura completa:", JSON.stringify(result, null, 2));
        throw new Error("Dados de transação não encontrados");
      }

      const txInfo = result.fulfillment_data.transaction;
      const params = txInfo.input_data?.parameters;

      if (!params) {
        console.error("❌ Transaction info:", JSON.stringify(txInfo, null, 2));
        throw new Error("Parâmetros de transação não encontrados");
      }

      console.log("✅ Parâmetros obtidos");
      console.log("  - Function:", txInfo.function);
      console.log("  - To:", txInfo.to);
      console.log("  - Value:", txInfo.value);

      const { ethers } = await import("ethers");

      const abi = [
        `function fulfillBasicOrder_efficient_6GL6yc(
          tuple(
            address considerationToken,
            uint256 considerationIdentifier,
            uint256 considerationAmount,
            address offerer,
            address zone,
            address offerToken,
            uint256 offerIdentifier,
            uint256 offerAmount,
            uint8 basicOrderType,
            uint256 startTime,
            uint256 endTime,
            bytes32 zoneHash,
            uint256 salt,
            bytes32 offererConduitKey,
            bytes32 fulfillerConduitKey,
            uint256 totalOriginalAdditionalRecipients,
            tuple(uint256 amount, address recipient)[] additionalRecipients,
            bytes signature
          ) parameters
        ) external payable returns (bool)`,
      ];

      const iface = new ethers.Interface(abi);

      const basicOrderParams = {
        considerationToken: params.considerationToken,
        considerationIdentifier: params.considerationIdentifier,
        considerationAmount: params.considerationAmount,
        offerer: params.offerer,
        zone: params.zone,
        offerToken: params.offerToken,
        offerIdentifier: params.offerIdentifier,
        offerAmount: params.offerAmount,
        basicOrderType: params.basicOrderType,
        startTime: params.startTime,
        endTime: params.endTime,
        zoneHash: params.zoneHash,
        salt: params.salt,
        offererConduitKey: params.offererConduitKey,
        fulfillerConduitKey: params.fulfillerConduitKey,
        totalOriginalAdditionalRecipients: params.totalOriginalAdditionalRecipients,
        additionalRecipients: params.additionalRecipients || [],
        signature: params.signature,
      };

      const txData = iface.encodeFunctionData(
        "fulfillBasicOrder_efficient_6GL6yc",
        [basicOrderParams]
      );

      console.log("✅ Calldata encodado com sucesso!");
      console.log("  - Data length:", txData.length);
      console.log("  - Data preview:", txData.substring(0, 66) + "...");

      const transaction = prepareTransaction({
        to: txInfo.to,
        chain: ethereum,
        client: client,
        data: txData as `0x${string}`,
        value: BigInt(txInfo.value),
      });

      console.log("📤 Enviando transação via Thirdweb...");

      sendTransaction(transaction, {
        onSuccess: (result) => {
          console.log("✅ Compra bem-sucedida:", result.transactionHash);
          alert(
            `✅ Compra realizada com sucesso!\n\n` +
              `Transação: ${result.transactionHash}\n\n` +
              `O NFT aparecerá na sua carteira em alguns minutos.`
          );
          removeInvalidListing(nft.tokenId);
          setPurchasing(null);
        },
        onError: (error) => {
          console.error("❌ Transação falhou:", error);
          alert(`❌ Transação falhou:\n\n${error.message}`);
          setPurchasing(null);
        },
      });
    } catch (error: any) {
      console.error("💥 Erro na compra:", error);
      alert(`❌ Erro ao processar compra:\n\n${error.message}`);
      setPurchasing(null);
    }
  };

  const handlePixPayment = () => {
    setShowPixSoon(true);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Carregando Cryptorastas...</p>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="space-y-4">
          <p className="text-gray-600">
            {error ?? "Nenhum Cryptorasta disponível no momento"}
          </p>
          <button
            onClick={() => { setError(null); refreshListings(); }}
            className="px-6 py-3 bg-rasta-green text-white rounded-lg font-bold hover:bg-rasta-green-dark transition-all shadow-md"
          >
            🔄 Atualizar Listagens
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Modal PIX - Em Breve */}
      {showPixSoon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full text-center">
            <div className="text-5xl mb-4">⏳</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Em Breve!
            </h3>
            <p className="text-gray-600 mb-6">
              O pagamento via PIX estará disponível em breve. Fique ligado!
            </p>
            <button
              onClick={() => setShowPixSoon(false)}
              className="w-full py-3 px-4 rounded-lg font-bold bg-rasta-yellow text-black hover:bg-rasta-yellow-dark transition-all shadow-md"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-4 mb-4">
        <button
          onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
          disabled={currentPage === 0}
          className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-rasta-green text-white rounded-lg font-bold hover:bg-rasta-green-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Anterior
        </button>
        <span className="py-2 text-gray-800 font-semibold text-sm sm:text-base">
          Página {currentPage + 1} de{" "}
          {Math.ceil(listings.length / ITEMS_PER_PAGE)}
        </span>
        <button
          onClick={() => setCurrentPage((p) => p + 1)}
          disabled={currentPage >= Math.ceil(listings.length / ITEMS_PER_PAGE) - 1}
          className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-rasta-green text-white rounded-lg font-bold hover:bg-rasta-green-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Próxima
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {listings
          .slice(
            currentPage * ITEMS_PER_PAGE,
            (currentPage + 1) * ITEMS_PER_PAGE
          )
          .map((nft) => (
            <div
              key={nft.tokenId}
              className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                {nft.image ? (
                  <img
                    src={nft.image}
                    alt={nft.name}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span className="text-gray-400 text-sm">Sem imagem</span>
                )}
              </div>
              <div className="p-3 sm:p-4">
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
                      className={`w-full py-2 rounded-lg font-bold transition-all shadow-md hover:shadow-lg ${
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
                      onClick={handlePixPayment}
                      className="w-full py-2 rounded-lg font-bold transition-all shadow-md hover:shadow-lg bg-rasta-yellow hover:bg-rasta-yellow-dark text-black"
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
