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

const btnStyle = (disabled: boolean) => ({
  padding: "0.5rem 1.25rem",
  borderRadius: "8px",
  fontWeight: 600,
  fontSize: "0.875rem",
  border: "1px solid var(--outline-variant)",
  background: disabled ? "var(--surface-mid)" : "var(--surface-high)",
  color: disabled ? "var(--on-surface-variant)" : "var(--on-background)",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.4 : 1,
  transition: "all 0.2s",
});

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

      if (data.next && cursors.length === pageNumber + 1) {
        setCursors(prev => [...prev, data.next]);
      }

      const { listings: fetchedListings } = data;

      const enriched = fetchedListings.map((nft: any) => ({
        ...nft,
        protocolAddress: nft.protocolAddress || SEAPORT_1_6_ADDRESS,
      }));

      const seenInPage = new Set<string>();
      const uniqueListings = enriched.filter((nft: any) => {
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
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(brlAmount);
  };

  const handlePixPayment = () => setShowPixSoon(true);

  const goToPreviousPage = () => {
    if (currentPage > 0) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (cursors[currentPage + 1] !== undefined) setCurrentPage(currentPage + 1);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 0" }}>
        <div style={{
          width: "2.5rem", height: "2.5rem", borderRadius: "50%",
          border: "3px solid var(--surface-high)",
          borderTopColor: "var(--gold)",
          animation: "spin 0.8s linear infinite",
          margin: "0 auto",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: "var(--on-surface-variant)", marginTop: "1rem" }}>Carregando Cryptorastas...</p>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 0" }}>
        <p style={{ color: "var(--on-surface-variant)", marginBottom: "1.5rem" }}>
          {error ?? "Nenhum Cryptorasta disponível no momento"}
        </p>
        <button
          onClick={() => { setError(null); refreshListings(); }}
          style={{
            padding: "0.75rem 1.5rem",
            borderRadius: "8px",
            fontWeight: 600,
            border: "1px solid var(--outline-variant)",
            background: "var(--surface-high)",
            color: "var(--on-background)",
            cursor: "pointer",
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
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 50, padding: "1rem",
        }}>
          <div style={{
            background: "var(--surface-mid)",
            borderRadius: "16px",
            padding: "2rem",
            maxWidth: "360px",
            width: "100%",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⏳</div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--on-background)", marginBottom: "0.5rem" }}>
              Em Breve!
            </h3>
            <p style={{ color: "var(--on-surface-variant)", marginBottom: "1.5rem" }}>
              O pagamento via PIX estará disponível em breve. Fique ligado!
            </p>
            <button
              onClick={() => setShowPixSoon(false)}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "8px",
                fontWeight: 700,
                border: "none",
                background: "var(--gold)",
                color: "#1a1500",
                cursor: "pointer",
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <button onClick={goToPreviousPage} disabled={currentPage === 0} style={btnStyle(currentPage === 0)}>
          Anterior
        </button>
        <span style={{ color: "var(--on-surface-variant)", fontSize: "0.875rem", fontWeight: 600 }}>
          Página {currentPage + 1}
        </span>
        <button onClick={goToNextPage} disabled={cursors[currentPage + 1] === undefined} style={btnStyle(cursors[currentPage + 1] === undefined)}>
          Próxima
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
        {listings.map((nft) => (
          <div
            key={nft.tokenId}
            style={{
              background: "var(--surface-high)",
              borderRadius: "12px",
              overflow: "hidden",
              transition: "transform 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            <div style={{ width: "100%", aspectRatio: "1", background: "var(--surface-mid)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {nft.image ? (
                <img
                  src={nft.image}
                  alt={nft.name}
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <span style={{ color: "var(--on-surface-variant)", fontSize: "0.75rem" }}>Sem imagem</span>
              )}
            </div>
            <div style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
              <p style={{ fontSize: "0.8125rem", color: "var(--on-surface-variant)", marginBottom: "0.25rem" }}>
                #{nft.tokenId}
              </p>
              <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--gold)", marginBottom: "0.75rem" }}>
                {formatBrlPrice(nft.price, nft.decimals)}
              </p>
              {account ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <button
                    onClick={handlePixPayment}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "8px",
                      fontWeight: 600,
                      fontSize: "0.8125rem",
                      border: "1px solid var(--outline-variant)",
                      background: "var(--surface-bright)",
                      color: "var(--on-background)",
                      cursor: "pointer",
                    }}
                  >
                    Comprar com PIX
                  </button>
                  <TransactionButton
                    transaction={async () => {
                      const tx = await preparePurchaseTransaction(nft);
                      if (!tx) throw new Error("Falha ao preparar transação");
                      return tx;
                    }}
                    onTransactionSent={() => setPurchasing(nft.tokenId)}
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
                        image: nft.image || "/Cryptorastas-logo-wide.png",
                      },
                    }}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "8px",
                      fontWeight: 700,
                      fontSize: "0.8125rem",
                      border: "none",
                      transition: "all 0.2s",
                      backgroundColor: purchasing === nft.tokenId ? "var(--surface-bright)" : "var(--gold)",
                      color: purchasing === nft.tokenId ? "var(--on-surface-variant)" : "#1a1500",
                      cursor: purchasing === nft.tokenId ? "not-allowed" : "pointer",
                    }}
                    disabled={purchasing === nft.tokenId}
                  >
                    {purchasing === nft.tokenId ? "Processando..." : "Comprar com Crédito/ETH"}
                  </TransactionButton>
                </div>
              ) : (
                <button
                  disabled
                  style={{
                    width: "100%",
                    marginTop: "0.5rem",
                    padding: "0.5rem",
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "0.8125rem",
                    border: "none",
                    background: "var(--surface-mid)",
                    color: "var(--on-surface-variant)",
                    cursor: "not-allowed",
                  }}
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
