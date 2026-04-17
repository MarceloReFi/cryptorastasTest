"use client";

import { useEffect, useState } from "react";
import { useActiveAccount, TransactionButton } from "thirdweb/react";
import { prepareTransaction, createThirdwebClient } from "thirdweb";
import { ethereum } from "thirdweb/chains";

declare global { interface Window { ethereum?: any; } }

const client = createThirdwebClient({ clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID! });
const SEAPORT_1_6_ADDRESS = "0x0000000000000068F116a894984e2DB1123eB395";
const font = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const INK  = "#1a1500";
const Y    = "#FFD800";

const btnPrimary: React.CSSProperties = {
  width: "100%", padding: "0.7rem 1rem", borderRadius: "999px",
  fontFamily: font, fontWeight: 700, fontSize: "0.875rem",
  border: "none", background: INK, color: Y, cursor: "pointer", transition: "opacity 0.2s",
};
const btnSecondary: React.CSSProperties = {
  width: "100%", padding: "0.65rem 1rem", borderRadius: "999px",
  fontFamily: font, fontWeight: 500, fontSize: "0.875rem",
  border: "1.5px solid " + INK, background: "transparent", color: INK, cursor: "pointer", transition: "opacity 0.2s",
};
const btnDisabled: React.CSSProperties = { ...btnSecondary, opacity: 0.4, cursor: "not-allowed" };

const MIN_PRICE_WEI = BigInt(
  Math.round(parseFloat(process.env.NEXT_PUBLIC_MIN_LISTING_ETH || "0.015") * 1e18).toString()
);

const paginationPill = (active: boolean): React.CSSProperties => ({
  padding: "0.5rem 1.5rem", borderRadius: "999px",
  fontFamily: font, fontWeight: active ? 700 : 400, fontSize: "0.875rem",
  background: active ? INK : "transparent", color: active ? Y : INK, border: "none",
  cursor: active ? "default" : "pointer",
  letterSpacing: active ? "0" : "0.1em",
  textTransform: active ? "none" : "uppercase" as const,
});

export function Marketplace({ itemsPerPage = 30 }: { itemsPerPage?: number }) {
  const [listings, setListings]       = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [purchasing, setPurchasing]   = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [cursors, setCursors]         = useState<(string | null)[]>([null]);
  const [pagesCache, setPagesCache]   = useState<Map<number, any[]>>(new Map());
  const [showPixSoon, setShowPixSoon] = useState(false);
  const [ethToBrl, setEthToBrl]       = useState<number>(18000);
  const account = useActiveAccount();

  const fetchListings = async (pageNumber: number, cursor: string | null = null) => {
    try {
      setLoading(true); setError(null);
      if (pagesCache.has(pageNumber)) { setListings(pagesCache.get(pageNumber)!); setLoading(false); return; }
      const apiUrl = `/api/opensea-listings?limit=${itemsPerPage}${cursor ? `&cursor=${cursor}` : ""}`;
      const response = await fetch(apiUrl);
      if (!response.ok) { setListings([]); return; }
      const data = await response.json();
      if (!data.listings?.length) { setListings([]); return; }
      if (data.next && cursors.length === pageNumber + 1) setCursors(prev => [...prev, data.next]);
      const enriched = data.listings.map((nft: any) => ({ ...nft, protocolAddress: nft.protocolAddress || SEAPORT_1_6_ADDRESS }));
      const seen = new Set<string>();
      const unique = enriched.filter((nft: any) => { if (seen.has(nft.tokenId)) return false; seen.add(nft.tokenId); return true; });
      const aboveFloor = unique.filter((nft: any) => {
        try { return BigInt(nft.price || "0") >= MIN_PRICE_WEI; } catch { return false; }
      });
      setPagesCache(prev => new Map(prev).set(pageNumber, aboveFloor));
      setListings(aboveFloor);
    } catch { setError("Erro ao buscar NFTs."); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchListings(currentPage, cursors[currentPage]); }, [currentPage]);

  useEffect(() => {
    async function fetchEthPrice() {
      try { const res = await fetch('/api/eth-price'); const d = await res.json(); if (d.brl) setEthToBrl(d.brl); } catch {}
    }
    fetchEthPrice();
    const t = setInterval(fetchEthPrice, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const refreshListings = () => { setPagesCache(new Map()); setCursors([null]); setCurrentPage(0); setListings([]); fetchListings(0, null); };
  const removeInvalidListing = (tokenId: string) => setListings(prev => prev.filter(n => n.tokenId !== tokenId));

  const preparePurchaseTransaction = async (nft: any) => {
    try {
      const response = await fetch("/api/fulfill-listing", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderHash: nft.orderHash, walletAddress: account?.address, protocolAddress: nft.protocolAddress }),
      });
      const result = await response.json();
      if (result.error) { if (result.error.includes("not found")) { removeInvalidListing(nft.tokenId); alert("❌ Este NFT já foi vendido."); return null; } throw new Error(result.error); }
      if (!result.fulfillment_data?.transaction) throw new Error("Dados de transação não encontrados");
      const txInfo = result.fulfillment_data.transaction;
      const params = txInfo.input_data?.parameters;
      if (!params) throw new Error("Parâmetros não encontrados");
      const { ethers } = await import("ethers");
      const abi = [`function fulfillBasicOrder_efficient_6GL6yc(tuple(address considerationToken,uint256 considerationIdentifier,uint256 considerationAmount,address offerer,address zone,address offerToken,uint256 offerIdentifier,uint256 offerAmount,uint8 basicOrderType,uint256 startTime,uint256 endTime,bytes32 zoneHash,uint256 salt,bytes32 offererConduitKey,bytes32 fulfillerConduitKey,uint256 totalOriginalAdditionalRecipients,tuple(uint256 amount,address recipient)[] additionalRecipients,bytes signature) parameters) external payable returns (bool)`];
      const iface = new ethers.Interface(abi);
      const txData = iface.encodeFunctionData("fulfillBasicOrder_efficient_6GL6yc", [{
        considerationToken: params.considerationToken, considerationIdentifier: params.considerationIdentifier,
        considerationAmount: params.considerationAmount, offerer: params.offerer, zone: params.zone,
        offerToken: params.offerToken, offerIdentifier: params.offerIdentifier, offerAmount: params.offerAmount,
        basicOrderType: params.basicOrderType, startTime: params.startTime, endTime: params.endTime,
        zoneHash: params.zoneHash, salt: params.salt, offererConduitKey: params.offererConduitKey,
        fulfillerConduitKey: params.fulfillerConduitKey, totalOriginalAdditionalRecipients: params.totalOriginalAdditionalRecipients,
        additionalRecipients: params.additionalRecipients || [], signature: params.signature,
      }]);
      return prepareTransaction({ to: txInfo.to, chain: ethereum, client, data: txData as `0x${string}`, value: BigInt(txInfo.value) });
    } catch (error: any) { alert(`❌ Erro: ${error.message}`); return null; }
  };

  const formatBrl = (ethPrice: string, decimals: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((parseInt(ethPrice) / Math.pow(10, decimals)) * ethToBrl);

  if (loading) return (
    <div style={{ textAlign: "center", padding: "3rem 0" }}>
      <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", border: "3px solid rgba(26,21,0,0.15)", borderTopColor: INK, animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: INK, opacity: 0.5, marginTop: "1rem", fontFamily: font, fontSize: "0.875rem" }}>Carregando...</p>
    </div>
  );

  if (listings.length === 0) return (
    <div style={{ textAlign: "center", padding: "3rem 0" }}>
      <p style={{ color: INK, opacity: 0.6, marginBottom: "1.5rem", fontFamily: font }}>{error ?? `Nenhum Cryptorasta disponível acima de ${(Number(MIN_PRICE_WEI) / 1e18).toFixed(2)} ETH no momento.`}</p>
      <button onClick={() => { setError(null); refreshListings(); }} style={{ ...btnSecondary, width: "auto", padding: "0.65rem 2rem" }}>Atualizar</button>
    </div>
  );

  const hasPrev = currentPage > 0;
  const hasNext = cursors[currentPage + 1] !== undefined;

  return (
    <>
      {showPixSoon && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }}>
          <div style={{ background: Y, borderRadius: "20px", padding: "2.5rem 2rem", maxWidth: "360px", width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⏳</div>
            <h3 style={{ fontFamily: font, fontWeight: 700, fontSize: "1.25rem", color: INK, marginBottom: "0.5rem" }}>Em Breve!</h3>
            <p style={{ fontFamily: font, fontSize: "0.875rem", color: INK, opacity: 0.6, marginBottom: "2rem" }}>O pagamento via PIX estará disponível em breve.</p>
            <button onClick={() => setShowPixSoon(false)} style={btnPrimary}>Fechar</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1.5rem", marginBottom: "2.5rem" }}>
        <button onClick={() => setCurrentPage(p => p - 1)} disabled={!hasPrev} style={{ ...paginationPill(false), opacity: hasPrev ? 1 : 0.3, cursor: hasPrev ? "pointer" : "not-allowed" }}>Anterior</button>
        <span style={paginationPill(true)}>Página {currentPage + 1}</span>
        <button onClick={() => setCurrentPage(p => p + 1)} disabled={!hasNext} style={{ ...paginationPill(false), opacity: hasNext ? 1 : 0.3, cursor: hasNext ? "pointer" : "not-allowed" }}>Próxima</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
        {listings.map((nft) => (
          <div key={nft.tokenId}
            style={{ background: Y, borderRadius: "20px", overflow: "hidden", border: "1.5px solid rgba(26,21,0,0.12)", transition: "transform 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-4px)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <div style={{ width: "100%", aspectRatio: "1", background: "#111", overflow: "hidden", borderRadius: "14px 14px 0 0" }}>
              {nft.image
                ? <img src={nft.image} alt={nft.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#555", fontSize: "0.75rem" }}>Sem imagem</span></div>
              }
            </div>
            <div style={{ padding: "1rem 1.25rem 1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem" }}>
                <span style={{ fontFamily: font, fontWeight: 700, fontSize: "1.125rem", color: INK }}>#{nft.tokenId}</span>
                <span style={{ fontFamily: font, fontWeight: 700, fontSize: "1rem", color: INK }}>{formatBrl(nft.price, nft.decimals)}</span>
              </div>
              {account ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  <button onClick={() => setShowPixSoon(true)} style={btnPrimary}>Comprar com PIX</button>
                  <TransactionButton
                    transaction={async () => { const tx = await preparePurchaseTransaction(nft); if (!tx) throw new Error("Falha"); return tx; }}
                    onTransactionSent={() => setPurchasing(nft.tokenId)}
                    onTransactionConfirmed={(r) => { alert(`Compra realizada!\n\nTransação: ${r.transactionHash}`); removeInvalidListing(nft.tokenId); setPurchasing(null); }}
                    onError={(e) => { alert(`❌ Falhou:\n\n${e.message}`); setPurchasing(null); }}
                    payModal={{ metadata: { name: `Comprar Cryptorasta #${nft.tokenId}`, image: nft.image || "/Cryptorastas-logo-wide.png" } }}
                    style={purchasing === nft.tokenId ? btnDisabled : btnSecondary}
                    disabled={purchasing === nft.tokenId}
                  >
                    {purchasing === nft.tokenId ? "Processando..." : "Comprar com Crédito/ETH"}
                  </TransactionButton>
                </div>
              ) : (
                <button disabled style={btnDisabled}>Conecte para Comprar</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
