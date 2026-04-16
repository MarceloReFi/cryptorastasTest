"use client";

import { useEffect, useState } from "react";
import { useActiveAccount, TransactionButton } from "thirdweb/react";
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

export function Marketplace({ itemsPerPage = 30 }: { itemsPerPage?: number }) {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [pagesCache, setPagesCache] = useState<Map<number, any[]>>(new Map());
  const [showPixSoon, setShowPixSoon] = useState(false);
  const [ethToBrl, setEthToBrl] = useState<number>(18000);
  const [priceError, setPriceError] = useState<string | null>(null);
  const ITEMS_PER_PAGE = itemsPerPage;
  const account = useActiveAccount();

  const fetchListings = async (pageNumber: number, cursor: string | null = null) => {
    try {
      setLoading(true);
      setError(null);

      // Verificar se página já está no cache
      if (pagesCache.has(pageNumber)) {
        console.log(`📦 Usando cache da página ${pageNumber + 1}`);
        setListings(pagesCache.get(pageNumber)!);
        setLoading(false);
        return;
      }

      console.log("🔍 Buscando listings:", cursor ? `página ${pageNumber + 1}` : "primeira página");

      const apiUrl = `/api/opensea-listings?limit=${ITEMS_PER_PAGE}${cursor ? `&cursor=${cursor}` : ""}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        console.error("❌ Erro na API opensea-listings:", response.status, response.statusText);
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

      // Salvar próximo cursor se existir
      if (data.next && cursors.length === pageNumber + 1) {
        setCursors(prev => [...prev, data.next]);
      }

      const { listings: fetchedListings, next: _next } = data;

      // Preserve fullOrder shape expected by purchase flow (protocolAddress fallback)
      const enriched = fetchedListings.map((nft: any) => ({
        ...nft,
        protocolAddress: nft.protocolAddress || SEAPORT_1_6_ADDRESS,
      }));

      // Remove duplicados dentro da mesma página
      const seenInPage = new Set<string>();
      const uniqueListings = enriched.filter((nft: any) => {
        if (seenInPage.has(nft.tokenId)) {
          return false;
        }
        seenInPage.add(nft.tokenId);
        return true;
      });

      console.log(`✅ ${uniqueListings.length} NFTs únicos carregados`);
      
      // Adicionar ao cache
      setPagesCache(prev => new Map(prev).set(pageNumber, uniqueListings));
      setListings(uniqueListings);
    } catch (error) {
      console.error("Error fetching listings:", error);
      setError("Erro ao buscar NFTs. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings(currentPage, cursors[currentPage]);
  }, [currentPage]);

  useEffect(() => {
    async function fetchEthPrice() {
      try {
        const response = await fetch('/api/eth-price');
        const data = await response.json();

        if (data.brl) {
          setEthToBrl(data.brl);
          setPriceError(data.error || null);
        }
      } catch (error) {
        console.error('Erro ao buscar preço ETH/BRL:', error);
        setPriceError('Erro ao carregar preço');
      }
    }

    fetchEthPrice();
    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchEthPrice, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const refreshListings = () => {
    setPagesCache(new Map());
    setCursors([null]);
    setCurrentPage(0);
    setListings([]);
    fetchListings(0, null);
  };

  const removeInvalidListing = (tokenId: string) => {
    setListings((prev) => prev.filter((nft) => nft.tokenId !== tokenId));
  };

  const preparePurchaseTransaction = async (nft: any) => {
    try {
      console.log("🔄 Preparando compra...");
      console.log("NFT:", nft.tokenId);
      console.log("Order Hash:", nft.orderHash);

      const response = await fetch("/api/fulfill-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderHash: nft.orderHash,
          walletAddress: account?.address,
          protocolAddress: nft.protocolAddress,
        }),
      });

      const result = await response.json();

      if (result.error) {
        if (result.error.includes("not found")) {
          removeInvalidListing(nft.tokenId);
          alert("❌ Este NFT já foi vendido. A lista será atualizada.");
          return null;
        }
        throw new Error(result.error);
      }

      if (!result.fulfillment_data?.transaction) {
        throw new Error("Dados de transação não encontrados");
      }

      const txInfo = result.fulfillment_data.transaction;
      const params = txInfo.input_data?.parameters;

      if (!params) {
        throw new Error("Parâmetros de transação não encontrados");
      }

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

      return prepareTransaction({
        to: txInfo.to,
        chain: ethereum,
        client: client,
        data: txData as `0x${string}`,
        value: BigInt(txInfo.value),
      });
    } catch (error: any) {
      console.error("💥 Erro ao preparar compra:", error);
      alert(`❌ Erro ao processar compra:\n\n${error.message}`);
      return null;
    }
  };

  const formatBrlPrice = (ethPrice: string, decimals: number) => {
    const ethAmount = parseInt(ethPrice) / Math.pow(10, decimals);
    const brlAmount = ethAmount * ethToBrl;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(brlAmount);
  };

  const handlePixPayment = () => {
    setShowPixSoon(true);
  };

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (cursors[currentPage + 1] !== undefined) {
      setCurrentPage(currentPage + 1);
    }
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
            Atualizar Listagens
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
      <div className="flex justify-center items-center gap-4 mb-4">
        <button
          onClick={goToPreviousPage}
          disabled={currentPage === 0}
          className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-rasta-green text-white rounded-lg font-bold hover:bg-rasta-green-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Anterior
        </button>
        <span className="py-2 text-gray-800 font-semibold text-sm sm:text-base">
          Página {currentPage + 1}
        </span>
        <button
          onClick={goToNextPage}
          disabled={cursors[currentPage + 1] === undefined}
          className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-rasta-green text-white rounded-lg font-bold hover:bg-rasta-green-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Próxima
        </button>
    
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {listings.map((nft) => (
            <div
              key={nft.tokenId}
              className="bg-gray-50 rounded-lg shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
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
              <div className="p-3 sm:p-4 text-center">
                <p className="font-bold text-sm text-gray-700">#{nft.tokenId}</p>
                <p className="text-lg font-bold text-green-600 mt-2">
                  {formatBrlPrice(nft.price, nft.decimals)}
                </p>
                {account ? (
                  <div className="space-y-2">
                    <button
                      onClick={handlePixPayment}
                      className="w-full py-2 rounded-lg font-bold transition-all shadow-md hover:shadow-lg bg-rasta-yellow hover:bg-rasta-yellow-dark text-black"
                    >
                      Comprar com PIX
                    </button>
                    <div className="w-full">
                      <TransactionButton
                        transaction={async () => {
                          const tx = await preparePurchaseTransaction(nft);
                          if (!tx) throw new Error("Falha ao preparar transação");
                          return tx;
                        }}
                        onTransactionSent={() => {
                          setPurchasing(nft.tokenId);
                        }}
                        onTransactionConfirmed={(receipt) => {
                          console.log("Compra bem-sucedida:", receipt.transactionHash);
                          alert(
                            `Compra realizada com sucesso!\n\n` +
                              `Transação: ${receipt.transactionHash}\n\n` +
                              `O NFT aparecerá na sua carteira em alguns minutos.`
                          );
                          removeInvalidListing(nft.tokenId);
                          setPurchasing(null);
                        }}
                        onError={(error) => {
                          console.error("❌ Transação falhou:", error);
                          alert(`❌ Transação falhou:\n\n${error.message}`);
                          setPurchasing(null);
                        }}
                        payModal={{
                          metadata: {
                            name: `Comprar Cryptorasta #${nft.tokenId}`,
                            image: nft.image || "/Cryptorastas-logo-wide.png"
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          borderRadius: '0.5rem',
                          fontWeight: 'bold',
                          transition: 'all 0.3s',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                          backgroundColor: purchasing === nft.tokenId ? '#9ca3af' : '#fbbf24',
                          color: purchasing === nft.tokenId ? '#4b5563' : '#000000',
                          cursor: purchasing === nft.tokenId ? 'not-allowed' : 'pointer',
                        }}
                        disabled={purchasing === nft.tokenId}
                      >
                        {purchasing === nft.tokenId ? "Processando..." : "Comprar com Crédito/ETH"}
                      </TransactionButton>
                    </div>
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
