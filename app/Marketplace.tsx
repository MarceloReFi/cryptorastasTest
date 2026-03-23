"use client";

import { useEffect, useState } from "react";
import { useActiveAccount, TransactionButton } from "thirdweb/react";
import { prepareTransaction, createThirdwebClient } from "thirdweb";
import { ethereum } from "thirdweb/chains";
import { NFTCard } from "./components/NFTCard";
import { PixBuyButton, ethButtonStyle, ethButtonProcessingStyle, ConnectPromptButton } from "./components/PurchaseButtons";

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

      if (pagesCache.has(pageNumber)) {
        console.log(`📦 Usando cache da página ${pageNumber + 1}`);
        setListings(pagesCache.get(pageNumber)!);
        setLoading(false);
        return;
      }

      let url = `https://api.opensea.io/api/v2/listings/collection/cryptorastas-collection/all?limit=${ITEMS_PER_PAGE}`;
      if (cursor) url += `&next=${cursor}`;

      console.log("🔍 Buscando listings:", cursor ? `página ${pageNumber + 1}` : "primeira página");

      const response = await fetch(url, {
        headers: {
          "X-API-KEY": process.env.NEXT_PUBLIC_OPENSEA_API_KEY || "",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("❌ Erro na API OpenSea:", response.status, response.statusText);
        setListings([]);
        return;
      }

      const data = await response.json();

      if (!data.listings || data.listings.length === 0) {
        console.warn("⚠️ Nenhum Cryptorasta disponível");
        setListings([]);
        return;
      }

      if (data.next && cursors.length === pageNumber + 1) {
        setCursors(prev => [...prev, data.next]);
      }

      const nftsWithDetails = await Promise.all(
        data.listings.map(async (listing: any) => {
          try {
            const tokenId = listing.protocol_data?.parameters?.offer?.[0]?.identifierOrCriteria;
            const contractAddress = listing.protocol_data?.parameters?.offer?.[0]?.token || "0x07cd221b2fe54094277a2f4e1c1bc6df14e63678";

            if (!tokenId) return null;

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
              protocolAddress: listing.protocol_address || SEAPORT_1_6_ADDRESS,
              fullOrder: listing,
            };
          } catch (error) {
            console.error("❌ Erro processando listing:", error);
            return null;
          }
        })
      );

      const validListings = nftsWithDetails.filter((nft) => nft !== null);
      const seenInPage = new Set<string>();
      const uniqueListings = validListings.filter(nft => {
        if (seenInPage.has(nft.tokenId)) return false;
        seenInPage.add(nft.tokenId);
        return true;
      });

      console.log(`✅ ${uniqueListings.length} NFTs únicos carregados`);
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
      if (!params) throw new Error("Parâmetros de transação não encontrados");

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

      const txData = iface.encodeFunctionData("fulfillBasicOrder_efficient_6GL6yc", [basicOrderParams]);

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
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(brlAmount);
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div
          className="w-12 h-12 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: "var(--cr-green)", borderRightColor: "var(--cr-yellow)" }}
        />
        <p style={{ color: "var(--cr-text-secondary)" }}>Carregando Cryptorastas...</p>
      </div>
    );
  }

  /* ── Empty / Error ── */
  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <p style={{ color: "var(--cr-text-secondary)" }}>
          {error ?? "Nenhum Cryptorasta disponível no momento"}
        </p>
        <button
          onClick={() => { setError(null); refreshListings(); }}
          className="px-6 py-2.5 rounded-[12px] font-bold text-white transition-all duration-300
                     hover:scale-[1.02] hover:shadow-lg"
          style={{
            background: "var(--cr-green)",
            boxShadow: "0 4px 14px var(--cr-green-glow)",
          }}
        >
          Atualizar Listagens
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Modal PIX - Em Breve */}
      {showPixSoon && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
          <div
            className="rounded-[var(--cr-radius-lg)] p-8 max-w-sm w-full text-center"
            style={{
              background: "var(--cr-bg-subtle)",
              border: "1px solid var(--cr-border)",
              boxShadow: "var(--cr-shadow-lg)",
            }}
          >
            <div className="text-5xl mb-4">⏳</div>
            <h3 className="text-xl font-bold mb-2" style={{ color: "var(--cr-text-primary)" }}>
              Em Breve!
            </h3>
            <p className="mb-6" style={{ color: "var(--cr-text-secondary)" }}>
              O pagamento via PIX estará disponível em breve. Fique ligado!
            </p>
            <button
              onClick={() => setShowPixSoon(false)}
              className="w-full py-3 px-4 rounded-[12px] font-bold transition-all duration-300 hover:scale-[1.02]"
              style={{
                background: "var(--cr-yellow)",
                color: "#000",
                boxShadow: "0 4px 14px var(--cr-yellow-glow)",
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-center items-center gap-4 mb-6">
        <button
          onClick={() => currentPage > 0 && setCurrentPage(currentPage - 1)}
          disabled={currentPage === 0}
          className="px-5 py-2 rounded-[12px] font-bold text-white text-sm transition-all duration-300
                     hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{
            background: "var(--cr-green)",
            boxShadow: currentPage === 0 ? "none" : "0 4px 14px var(--cr-green-glow)",
          }}
        >
          Anterior
        </button>
        <span className="text-sm font-semibold px-2" style={{ color: "var(--cr-text-secondary)" }}>
          Página {currentPage + 1}
        </span>
        <button
          onClick={() => cursors[currentPage + 1] !== undefined && setCurrentPage(currentPage + 1)}
          disabled={cursors[currentPage + 1] === undefined}
          className="px-5 py-2 rounded-[12px] font-bold text-white text-sm transition-all duration-300
                     hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{
            background: "var(--cr-green)",
            boxShadow: cursors[currentPage + 1] === undefined ? "none" : "0 4px 14px var(--cr-green-glow)",
          }}
        >
          Próxima
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {listings.map((nft) => (
          <NFTCard key={nft.tokenId} tokenId={nft.tokenId} name={nft.name} image={nft.image}>
            {/* Price */}
            <p className="text-center font-bold text-base" style={{ color: "var(--cr-yellow)" }}>
              {formatBrlPrice(nft.price, nft.decimals)}
            </p>

            {/* Buttons */}
            {account ? (
              <>
                <PixBuyButton onClick={() => setShowPixSoon(true)} />
                <TransactionButton
                  transaction={async () => {
                    const tx = await preparePurchaseTransaction(nft);
                    if (!tx) throw new Error("Falha ao preparar transação");
                    return tx;
                  }}
                  onTransactionSent={() => setPurchasing(nft.tokenId)}
                  onTransactionConfirmed={(receipt) => {
                    alert(
                      `Compra realizada com sucesso!\n\nTransação: ${receipt.transactionHash}\n\nO NFT aparecerá na sua carteira em alguns minutos.`
                    );
                    removeInvalidListing(nft.tokenId);
                    setPurchasing(null);
                  }}
                  onError={(error) => {
                    alert(`❌ Transação falhou:\n\n${error.message}`);
                    setPurchasing(null);
                  }}
                  payModal={{
                    metadata: {
                      name: `Comprar Cryptorasta #${nft.tokenId}`,
                      image: nft.image || "/Cryptorastas-logo-wide.png",
                    },
                  }}
                  style={purchasing === nft.tokenId ? ethButtonProcessingStyle : ethButtonStyle}
                  disabled={purchasing === nft.tokenId}
                >
                  {purchasing === nft.tokenId ? "Processando..." : "Comprar com ETH"}
                </TransactionButton>
              </>
            ) : (
              <ConnectPromptButton />
            )}
          </NFTCard>
        ))}
      </div>
    </>
  );
}
