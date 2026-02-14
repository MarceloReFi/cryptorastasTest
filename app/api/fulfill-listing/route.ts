import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { orderHash, walletAddress } = await request.json();

    const response = await fetch(
      "https://api.opensea.io/api/v2/listings/fulfillment_data",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": process.env.NEXT_PUBLIC_OPENSEA_API_KEY || "",
        },
        body: JSON.stringify({
          listing: {
            hash: orderHash,
            chain: "ethereum",
            protocol_address: "0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC",
          },
          fulfiller: {
            address: walletAddress,
          },
        }),
      }
    );

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Fulfill error:", error);
    return NextResponse.json(
      { error: "Failed to get fulfillment data" },
      { status: 500 }
    );
  }
}