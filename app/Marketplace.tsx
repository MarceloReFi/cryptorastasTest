"use client";

import { useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function Marketplace({ itemsPerPage = 20 }: { itemsPerPage?: number }) {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [pixModal, setPixModal] = useState<{
    payment_id: string;
    amount_brl: number;
    qr_code?: string;
    ticket_url?: string;
  } | null>(null);
  const ITEMS_PER_PAGE = itemsPerPage;
  const account = useActiveAccount();

  useEffect(() => {
    async function fetchListings() {
      try {
        const url =
          "https://api.opensea.io/api/v2/orders/ethereum/seaport/listings" +
          "?asset_contract_address=0x07cd221b2fe54094277a2f4e1c1bc6df14e63678" +
          "&limit=50&order_by=eth_price&order_direction=asc";

        console.log("🔍 Buscando orders ativos...");

        const response = await fetch(url, {
          headers: {
            "X-API-KEY": process.env.NEXT_PUBLIC_OPENSEA_API_KEY || "",
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();
        console.log("📊 Orders response:", data);

        if (!data.orders || data.orders.length === 0) {
          console.warn("⚠️ Nenhum order ativo encontrado");
          setListings([]);
          return;
        }

        const allListings = data.orders;
        console.log(`📦 Total de ${allListings.length} orders ativos recebidos`);

        const nftsWithDetails = await Promise.all(
          allListings.map(async (order: any) => {
            try {
              const tokenId =
                order.maker_asset_bundle?.assets?.[0]?.token_id ||
                order.protocol_data?.parameters?.offer?.[0]?.identifierOrCriteria;

              const contractAddress =
                order.maker_asset_bundle?.assets?.[0]?.asset_contract?.address ||
                order.protocol_data?.parameters?.offer?.[0]?.token ||
                "0x07cd221b2fe54094277a2f4e1c1bc6df14e63678";

              if (!tokenId) {
                console.warn("⚠️ Order sem token_id:", order.order_hash);
                return null;
              }

              const nftResponse = await fetch(
                `https://eth-mainnet.g.alchemy.com/nft/v3/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}/getNFTMetadata?contractAddress=${contractAddress}&tokenId=${tokenId}`,
                { headers: { accept: "application/json" } }
              );

              const nftData = await nftResponse.json();

              return {
                tokenId,
                name: nftData.name || `CryptoRasta #${tokenId}`,
                image: nftData.image?.cachedUrl || nftData.image?.originalUrl || "",
                price: order.current_price || order.base_price,
                decimals: 18,
                orderHash: order.order_hash,
                protocolAddress:
                  order.protocol_address ||
                  "0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC",
                fullOrder: order,
              };
            } catch (error) {
              console.error("❌ Erro processando order:", error);
              return null;
            }
          })
        );

        const validListings = nftsWithDetails.filter((nft) => nft !== null);
        console.log(`✅ ${validListings.length} NFTs válidos carregados`);
        setListings(validListings);
      } catch (error) {
        console.error("Error fetching listings:", error);
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

  const closePixModal = () => setPixModal(null);

  const openPixQRCode = () => {
    if (pixModal?.ticket_url) {
      window.open(pixModal.ticket_url, "_blank");
    }
  };

  const handlePurchase = async (nft: any) => {
    if (!account) {
      alert("Por favor, conecte sua carteira primeiro!");
      return;
    }

    setPurchasing(nft.tokenId);

    try {
      console.log("🔄 Iniciando compra com OpenSea SDK...");
      console.log("NFT:", nft.tokenId);
      console.log("Order Hash:", nft.orderHash);

      if (!window.ethereum) {
        throw new Error(
          "MetaMask não encontrado. Por favor, instale MetaMask para continuar."
        );
      }

      const { BrowserProvider } = await import("ethers");
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      console.log("📦 Inicializando OpenSea SDK...");
      const { OpenSeaSDK, Chain } = await import("opensea-js");

      const sdk = new OpenSeaSDK(signer, {
        chain: Chain.Mainnet,
        apiKey: process.env.NEXT_PUBLIC_OPENSEA_API_KEY,
      });

      console.log("🔍 Executando order...");
      console.log("📤 Executando transação...");
      const txHash = await sdk.fulfillOrder({
        order: nft.fullOrder,
        accountAddress: account.address,
      });

      console.log("✅ Transação enviada:", txHash);

      alert(
        `✅ Compra realizada com sucesso!\n\n` +
          `Hash da transação: ${txHash}\n\n` +
          `Aguarde alguns minutos para o NFT aparecer na sua carteira.`
      );

      removeInvalidListing(nft.tokenId);
      setPurchasing(null);
    } catch (error: any) {
      console.error("💥 Erro na compra:", error);

      let errorMessage = error.message || "Erro desconhecido";

      if (
        errorMessage.includes("user rejected") ||
        errorMessage.includes("User denied")
      ) {
        errorMessage = "Você rejeitou a transação na sua carteira.";
      } else if (errorMessage.includes("insufficient funds")) {
        errorMessage = "Saldo insuficiente de ETH na sua carteira.";
      } else if (
        errorMessage.includes("Order not found") ||
        errorMessage.includes("not found")
      ) {
        errorMessage = "NFT já foi vendido. A lista será atualizada.";
        removeInvalidListing(nft.tokenId);
      }

      alert(`❌ Erro ao comprar NFT:\n\n${errorMessage}`);
      setPurchasing(null);
    }
  };

  const handlePixPayment = async (nft: any) => {
    if (!account) {
      alert("Por favor, conecte sua carteira primeiro!");
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

      setPixModal({
        payment_id: data.payment_id,
        amount_brl: data.amount_brl,
        qr_code: data.qr_code,
        ticket_url: data.ticket_url,
      });

      setPurchasing(null);
    } catch (error: any) {
      console.error("PIX payment error:", error);
      alert(`Falha ao criar pagamento PIX: ${error.message}`);
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
        <div className="space-y-4">
          <p className="text-gray-600">Nenhuma CryptoRasta disponível no momento</p>
          <button
            onClick={refreshListings}
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
      {/* Modal PIX */}
      {pixModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Pagamento PIX Criado
            </h3>

            <div className="space-y-3 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-gray-600">Valor:</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {pixModal.amount_brl.toFixed(2)}
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-600">ID do Pagamento:</p>
                <p className="text-xs font-mono text-gray-800 break-all">
                  {pixModal.payment_id}
                </p>
              </div>

              <p className="text-sm text-gray-600 text-center">
                Clique em &quot;Abrir QR Code&quot; para escanear ou copiar o código PIX
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={closePixModal}
                className="flex-1 py-3 px-4 rounded-lg font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
              >
                Fechar
              </button>
              <button
                onClick={openPixQRCode}
                className="flex-1 py-3 px-4 rounded-lg font-bold bg-rasta-yellow text-black hover:bg-rasta-yellow-dark transition-all shadow-md"
              >
                Abrir QR Code PIX
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botão Refresh */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">
          {listings.length} NFTs disponíveis
        </p>
        <button
          onClick={refreshListings}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all text-sm"
        >
          🔄 Atualizar
        </button>
      </div>

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
                      onClick={() => handlePixPayment(nft)}
                      disabled={purchasing === nft.tokenId}
                      className={`w-full py-2 rounded-lg font-bold transition-all shadow-md hover:shadow-lg ${
                        purchasing === nft.tokenId
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-rasta-yellow hover:bg-rasta-yellow-dark text-black"
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
