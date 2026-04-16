import { NextRequest, NextResponse } from "next/server";

const CRYPTORASTAS_CONTRACT = "0x07cd221b2fe54094277a2f4e1c1bc6df14e63678";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json({ error: "wallet param required" }, { status: 400 });
  }

  const url = `https://eth-mainnet.g.alchemy.com/nft/v3/${process.env.ALCHEMY_API_KEY}/getNFTsForOwner?owner=${wallet}&contractAddresses[]=${CRYPTORASTAS_CONTRACT}`;

  const response = await fetch(url, {
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Alchemy API error", status: response.status },
      { status: response.status }
    );
  }

  const data = await response.json();

  const nfts = (data.ownedNfts ?? []).map((nft: any) => ({
    tokenId: nft.tokenId,
    title: nft.name || `CryptoRasta #${nft.tokenId}`,
    image:
      nft.image?.cachedUrl ||
      nft.image?.thumbnailUrl ||
      nft.image?.originalUrl ||
      "",
  }));

  return NextResponse.json(nfts);
}
