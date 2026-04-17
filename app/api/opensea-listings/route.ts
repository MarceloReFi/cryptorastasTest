import { NextRequest, NextResponse } from "next/server";

const CRYPTORASTAS_CONTRACT = "0x07cd221b2fe54094277a2f4e1c1bc6df14e63678";
const MIN_PRICE_WEI = BigInt(15000000000000000); // 0.015 ETH

const metadataCache = new Map<string, { name: string; image: string; cachedAt: number }>();
const METADATA_TTL = 60 * 60 * 1000; // 1 hour

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") || "30";
  const cursor = searchParams.get("cursor");

  const fetchLimit = Math.min(parseInt(limit) * 4, 100);
  let url = `https://api.opensea.io/api/v2/listings/collection/cryptorastas-collection/all?limit=${fetchLimit}`;
  if (cursor) {
    url += `&next=${cursor}`;
  }

  const openSeaResponse = await fetch(url, {
    headers: {
      "X-API-KEY": process.env.OPENSEA_API_KEY || "",
      "Content-Type": "application/json",
    },
  });

  if (!openSeaResponse.ok) {
    return NextResponse.json(
      { error: "OpenSea API error", status: openSeaResponse.status },
      { status: openSeaResponse.status }
    );
  }

  const data = await openSeaResponse.json();

  if (!data.listings || data.listings.length === 0) {
    return NextResponse.json({ listings: [], next: null });
  }

  const nftsWithDetails = await Promise.all(
    data.listings.map(async (listing: any) => {
      try {
        const tokenId =
          listing.protocol_data?.parameters?.offer?.[0]?.identifierOrCriteria;

        if (!tokenId) {
          return null;
        }

        const cached = metadataCache.get(tokenId);
        let name: string;
        let image: string;

        if (cached && Date.now() - cached.cachedAt < METADATA_TTL) {
          ({ name, image } = cached);
        } else {
          const nftResponse = await fetch(
            `https://eth-mainnet.g.alchemy.com/nft/v3/${process.env.ALCHEMY_API_KEY}/getNFTMetadata?contractAddress=${CRYPTORASTAS_CONTRACT}&tokenId=${tokenId}`,
            { headers: { accept: "application/json" } }
          );

          const nftData = await nftResponse.json();
          name = nftData.name || `Cryptorasta #${tokenId}`;
          image = nftData.image?.cachedUrl || nftData.image?.originalUrl || "";
          metadataCache.set(tokenId, { name, image, cachedAt: Date.now() });
        }

        return {
          tokenId,
          name,
          image,
          price: listing.price?.current?.value || "0",
          decimals: listing.price?.current?.decimals || 18,
          orderHash: listing.order_hash,
          protocolAddress: listing.protocol_address,
        };
      } catch {
        return null;
      }
    })
  );

  const listings = nftsWithDetails.filter((nft) => nft !== null);

  const filtered = listings.filter((nft) => {
    try { return BigInt(nft!.price) >= MIN_PRICE_WEI; } catch { return false; }
  });

  return NextResponse.json({ listings: filtered.slice(0, parseInt(limit)), next: data.next ?? null });
}
